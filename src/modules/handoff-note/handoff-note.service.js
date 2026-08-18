const repository = require('./handoff-note.repository')
const timelineService = require('../timeline/timeline.service')

const createError = (message, statusCode) => {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

const getAll = async (householdId, { limit } = {}) => {
  const parsed = Number(limit)
  const safeLimit = Number.isFinite(parsed) ? Math.min(Math.max(Math.trunc(parsed), 1), 200) : 50

  return repository.findAll({ householdId }, { limit: safeLimit })
}

const createOne = async (householdId, membership, { text }) => {
  const note = await repository.create({
    householdId,
    authorMemberId: membership._id,
    text
  })

  // A handoff note is exactly the kind of thing the next caregiver should
  // see in the family timeline, so unlike chat messages it does record one.
  await timelineService.recordEvent({
    householdId,
    actorMemberId: membership._id,
    type: 'task',
    title: 'บันทึกส่งต่อเวร',
    detail: note.text,
    relatedId: note._id
  })

  return note
}

const deleteOne = async (id, householdId, membership) => {
  const note = await repository.findById(id)
  if (!note || String(note.householdId) !== String(householdId)) {
    throw createError('Handoff note not found', 404)
  }

  const isAuthor = String(note.authorMemberId._id || note.authorMemberId) === String(membership._id)
  const isPrivileged = membership.role === 'owner' || membership.role === 'caregiver'
  if (!isAuthor && !isPrivileged) {
    throw createError('You do not have permission to delete this note', 403)
  }

  return repository.deleteById(id)
}

module.exports = {
  getAll,
  createOne,
  deleteOne
}
