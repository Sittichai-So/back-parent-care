const Task = require('./task.model')

const findAll = async (filter = {}) => {
  return Task.find(filter).sort({ createdAt: -1 }).populate('assignedToMemberId', 'displayName')
}

const findById = async (id) => {
  return Task.findById(id).populate('assignedToMemberId', 'displayName')
}

const create = async (data) => {
  return Task.create(data)
}

const updateById = async (id, data) => {
  return Task.findByIdAndUpdate(id, data, { new: true, runValidators: true }).populate(
    'assignedToMemberId',
    'displayName'
  )
}

const deleteById = async (id) => {
  return Task.findByIdAndDelete(id)
}

module.exports = {
  findAll,
  findById,
  create,
  updateById,
  deleteById
}
