const Message = require('./message.model')

const SENDER_FIELDS = 'displayName role avatar'

// Newest-first with an optional `before` cursor, so the caller can page
// backwards through history. The service reverses the page into display
// order (oldest first) — doing it here would break the cursor semantics.
const findPage = async (householdId, { limit = 50, before } = {}) => {
  const filter = { householdId, isDeleted: false }
  if (before) {
    filter.createdAt = { $lt: before }
  }

  return Message.find(filter).sort({ createdAt: -1 }).limit(limit).populate('senderMemberId', SENDER_FIELDS)
}

const findById = async (id) => {
  return Message.findById(id).populate('senderMemberId', SENDER_FIELDS)
}

const create = async (data) => {
  const message = await Message.create(data)
  return message.populate('senderMemberId', SENDER_FIELDS)
}

const softDeleteById = async (id) => {
  return Message.findByIdAndUpdate(id, { isDeleted: true }, { new: true }).populate('senderMemberId', SENDER_FIELDS)
}

module.exports = {
  findPage,
  findById,
  create,
  softDeleteById
}
