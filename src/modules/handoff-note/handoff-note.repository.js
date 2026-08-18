const HandoffNote = require('./handoff-note.model')

const AUTHOR_FIELDS = 'displayName role'

const findAll = async (filter = {}, { limit = 50 } = {}) => {
  return HandoffNote.find(filter).sort({ createdAt: -1 }).limit(limit).populate('authorMemberId', AUTHOR_FIELDS)
}

const findById = async (id) => {
  return HandoffNote.findById(id).populate('authorMemberId', AUTHOR_FIELDS)
}

const create = async (data) => {
  const note = await HandoffNote.create(data)
  return note.populate('authorMemberId', AUTHOR_FIELDS)
}

const deleteById = async (id) => {
  return HandoffNote.findByIdAndDelete(id)
}

module.exports = {
  findAll,
  findById,
  create,
  deleteById
}
