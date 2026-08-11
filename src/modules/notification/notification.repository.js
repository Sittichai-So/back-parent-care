const Notification = require('./notification.model')

const findAll = async (filter = {}) => {
  return Notification.find(filter).sort({ createdAt: -1 })
}

const findById = async (id) => {
  return Notification.findById(id)
}

const create = async (data) => {
  return Notification.create(data)
}

const updateById = async (id, data) => {
  return Notification.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true
  })
}

module.exports = {
  findAll,
  findById,
  create,
  updateById
}
