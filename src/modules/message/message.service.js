const repository = require('./message.repository')
const { emitToHousehold, householdRoom } = require('../../interfaces/socket/emitter')

const createError = (message, statusCode) => {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

// Design rule 3 (viewer read-only) lists "send message" among the gated
// actions. Checked here rather than only in route middleware because the
// Socket.IO path reaches sendMessage without passing through Express.
const assertCanSend = (membership) => {
  if (membership.role === 'viewer') {
    throw createError('ผู้ใช้สิทธิ์ดูอย่างเดียวส่งข้อความไม่ได้', 403)
  }
}

// Returns the page in display order (oldest first), which is how the chat
// screen stacks bubbles top-to-bottom and appends new ones at the bottom.
// `limit` arrives straight off the query string (validationMiddleware only
// covers req.body, matching how tasks/vitals read their filters), so it's
// clamped here rather than trusted.
const getHistory = async (householdId, { limit, before } = {}) => {
  const parsed = Number(limit)
  const safeLimit = Number.isFinite(parsed) ? Math.min(Math.max(Math.trunc(parsed), 1), 200) : 50

  const page = await repository.findPage(householdId, { limit: safeLimit, before })
  return page.reverse()
}

/**
 * Persists a message and broadcasts it to everyone currently in the
 * household's room. Both the REST route and the socket `send_message`
 * handler funnel through here, so a message sent over HTTP still reaches
 * live socket clients and vice versa — the two transports are never allowed
 * to diverge.
 */
const sendMessage = async (householdId, membership, { text }) => {
  assertCanSend(membership)

  const message = await repository.create({
    householdId,
    senderMemberId: membership._id,
    senderUserId: membership.userId,
    text
  })

  emitToHousehold(householdId, 'receive_message', message.toJSON())

  return message
}

const deleteMessage = async (id, householdId, membership) => {
  const message = await repository.findById(id)
  if (!message || String(message.householdId) !== String(householdId) || message.isDeleted) {
    throw createError('ไม่พบข้อความนี้', 404)
  }

  // Anyone may remove their own message; owner/caregiver may remove any, so
  // a household lead can clear something inappropriate.
  const isSender = String(message.senderMemberId._id || message.senderMemberId) === String(membership._id)
  const isPrivileged = membership.role === 'owner' || membership.role === 'caregiver'
  if (!isSender && !isPrivileged) {
    throw createError('คุณไม่มีสิทธิ์ลบข้อความนี้', 403)
  }

  const deleted = await repository.softDeleteById(id)
  emitToHousehold(householdId, 'message_deleted', { _id: String(deleted._id), householdId: String(householdId) })

  return deleted
}

module.exports = {
  getHistory,
  sendMessage,
  deleteMessage,
  householdRoom
}
