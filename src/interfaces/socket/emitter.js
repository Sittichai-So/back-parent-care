/**
 * Holds the process's Socket.IO server so domain services can broadcast
 * without importing the gateway.
 *
 * This indirection exists to break a cycle: the gateway needs
 * message.service (to persist what arrives over a socket), and
 * message.service needs to broadcast what it persisted. Both depend on this
 * module instead, and this module depends on nothing.
 *
 * Every emit is a no-op until setIo() runs, so anything that writes through
 * a service still works in contexts with no socket server at all — seed
 * scripts, tests, or a REST-only deployment.
 */

let io = null

const setIo = (instance) => {
  io = instance
}

const getIo = () => io

// One room per household — the design has a single family conversation per
// บ้าน, no sub-channels. Prefixed so a household id can never collide with
// a socket's own auto-joined room (which is keyed by socket id).
const householdRoom = (householdId) => `household:${String(householdId)}`

const emitToHousehold = (householdId, event, payload) => {
  if (!io) return false
  io.to(householdRoom(householdId)).emit(event, payload)
  return true
}

module.exports = {
  setIo,
  getIo,
  householdRoom,
  emitToHousehold
}
