const repository = require('./document.repository')

const createError = (message, statusCode) => {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

const findOwned = async (id, householdId) => {
  const document = await repository.findById(id)
  if (!document || String(document.householdId) !== String(householdId)) {
    throw createError('ไม่พบเอกสารนี้', 404)
  }
  return document
}

const getAll = async (householdId, { memberId, kind } = {}) => {
  const filter = { householdId }
  if (memberId) filter.memberId = memberId
  if (kind) filter.kind = kind
  return repository.findAll(filter)
}

// memberId is passed through as given rather than run through
// resolveWriteMemberId: a document may legitimately belong to the household
// and no one member (null), which that helper treats as a missing required
// value. Who may write at all is settled by the route's role middleware.
const createOne = async (householdId, membership, data) => {
  return repository.create({ ...data, householdId, createdByMemberId: membership._id })
}

const updateOne = async (id, householdId, data) => {
  await findOwned(id, householdId)
  return repository.updateById(id, data)
}

const deleteOne = async (id, householdId) => {
  await findOwned(id, householdId)
  return repository.deleteById(id)
}

module.exports = {
  getAll,
  createOne,
  updateOne,
  deleteOne
}
