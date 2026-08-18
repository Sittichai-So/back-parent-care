const Document = require('./document.model')

const MEMBER_FIELDS = 'displayName relation'

const findAll = async (filter = {}) => {
  return Document.find(filter).sort({ createdAt: -1 }).populate('memberId', MEMBER_FIELDS)
}

const findById = async (id) => {
  return Document.findById(id).populate('memberId', MEMBER_FIELDS)
}

const create = async (data) => {
  const document = await Document.create(data)
  return document.populate('memberId', MEMBER_FIELDS)
}

const updateById = async (id, data) => {
  return Document.findByIdAndUpdate(id, data, { new: true, runValidators: true }).populate('memberId', MEMBER_FIELDS)
}

const deleteById = async (id) => {
  return Document.findByIdAndDelete(id)
}

module.exports = {
  findAll,
  findById,
  create,
  updateById,
  deleteById
}
