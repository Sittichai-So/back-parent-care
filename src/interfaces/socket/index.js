const { Server } = require('socket.io')
const { verifyToken } = require('../../utils/jwt')
const HouseholdMember = require('../../modules/household/household-member.model')
const messageService = require('../../modules/message/message.service')
const { setIo, householdRoom } = require('./emitter')

/**
 * Real-time family chat (design screen 08).
 *
 * Attached to the same HTTP server Express listens on — there is no second
 * port and no second process. See server.js.
 *
 * Auth mirrors http/middlewares/auth.middleware.js: the same JWT, verified
 * once during the handshake rather than per event, so an unauthenticated
 * socket is never allowed to connect at all. Room membership is then checked
 * against HouseholdMember exactly the way householdMiddleware does for REST,
 * because a valid token proves who you are, not which households you may
 * read.
 */

const readToken = (socket) => {
  const { auth = {}, headers = {}, query = {} } = socket.handshake
  if (auth.token) return String(auth.token).replace(/^Bearer /, '')

  const header = headers.authorization || ''
  if (header.startsWith('Bearer ')) return header.slice(7)

  return query.token ? String(query.token) : null
}

// Same membership rules householdMiddleware enforces: active, and not an
// invite the person hasn't accepted yet.
const findMembership = async (householdId, userId) => {
  return HouseholdMember.findOne({
    householdId,
    userId,
    isActive: true,
    membershipState: { $ne: 'pending' }
  })
}

const authenticate = async (socket, next) => {
  const token = readToken(socket)
  if (!token) {
    return next(new Error('Authentication required'))
  }

  try {
    const decoded = verifyToken(token)
    socket.data.user = decoded
    // Which household rooms this socket has been cleared for. Consulted by
    // send_message/typing so those events can't target a room the socket
    // merely guessed the id of.
    socket.data.memberships = new Map()
    return next()
  } catch (error) {
    return next(new Error('Invalid or expired token'))
  }
}

const registerHandlers = (socket) => {
  const { user } = socket.data

  /**
   * join_family_room — { householdId } → ack { ok, householdId, membershipId }
   * Verifies membership before joining; a non-member is refused rather than
   * silently placed in an empty room.
   */
  socket.on('join_family_room', async ({ householdId } = {}, ack) => {
    const respond = typeof ack === 'function' ? ack : () => {}

    if (!householdId) {
      return respond({ ok: false, error: 'householdId is required' })
    }

    try {
      const membership = await findMembership(householdId, user.id)
      if (!membership) {
        return respond({ ok: false, error: 'You are not a member of this household' })
      }

      socket.data.memberships.set(String(householdId), membership)
      socket.join(householdRoom(householdId))

      socket.to(householdRoom(householdId)).emit('member_joined', {
        householdId: String(householdId),
        memberId: String(membership._id),
        displayName: membership.displayName
      })

      return respond({
        ok: true,
        householdId: String(householdId),
        membershipId: String(membership._id),
        role: membership.role
      })
    } catch (error) {
      return respond({ ok: false, error: 'Could not join the family room' })
    }
  })

  socket.on('leave_family_room', ({ householdId } = {}, ack) => {
    const respond = typeof ack === 'function' ? ack : () => {}
    if (!householdId) return respond({ ok: false, error: 'householdId is required' })

    socket.data.memberships.delete(String(householdId))
    socket.leave(householdRoom(householdId))
    return respond({ ok: true })
  })

  /**
   * send_message — { householdId, text } → ack { ok, message }
   * Persists through the same service the REST route uses, which is what
   * broadcasts `receive_message` to the room (sender included, so the
   * sender's own bubble comes from the server rather than being echoed
   * optimistically and risking divergence).
   */
  socket.on('send_message', async ({ householdId, text } = {}, ack) => {
    const respond = typeof ack === 'function' ? ack : () => {}

    const membership = socket.data.memberships.get(String(householdId))
    if (!membership) {
      return respond({ ok: false, error: 'Join the family room first' })
    }
    if (typeof text !== 'string' || text.trim().length === 0) {
      return respond({ ok: false, error: 'text is required' })
    }
    if (text.trim().length > 2000) {
      return respond({ ok: false, error: 'text is too long' })
    }

    try {
      const message = await messageService.sendMessage(householdId, membership, { text: text.trim() })
      return respond({ ok: true, message: message.toJSON() })
    } catch (error) {
      return respond({ ok: false, error: error.message || 'Could not send the message' })
    }
  })

  // typing / stop_typing are broadcast-only and never persisted — they carry
  // no state worth storing, and `socket.to(...)` excludes the sender so a
  // client never sees its own indicator.
  const emitTyping = (event) => ({ householdId } = {}) => {
    const membership = socket.data.memberships.get(String(householdId))
    if (!membership) return

    socket.to(householdRoom(householdId)).emit(event, {
      householdId: String(householdId),
      memberId: String(membership._id),
      displayName: membership.displayName
    })
  }

  socket.on('typing', emitTyping('typing'))
  socket.on('stop_typing', emitTyping('stop_typing'))
}

const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    // Matches app.js's permissive `cors()` — the API and the socket must not
    // disagree about who may connect. Tighten both together, not one alone.
    cors: { origin: '*' },
    path: '/socket.io'
  })

  io.use(authenticate)
  io.on('connection', (socket) => {
    registerHandlers(socket)
  })

  setIo(io)
  return io
}

module.exports = { initSocket }
