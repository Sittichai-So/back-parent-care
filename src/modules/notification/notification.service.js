const repository = require('./notification.repository')

const getAll = async (userId) => {
  return repository.findAll({ userId })
}

const getById = async (id) => {
  return repository.findById(id)
}

// Called internally by other modules (emergency alerts, task assignment) —
// there's no public POST /notifications route, notifications are always a
// side effect of some other action.
const create = async (data) => {
  return repository.create(data)
}

const markAsRead = async (id) => {
  return repository.updateById(id, { isRead: true })
}

const markAllAsRead = async (userId) => {
  const items = await repository.findAll({ userId })
  return Promise.all(items.map((item) => repository.updateById(item._id, { isRead: true })))
}

module.exports = {
  getAll,
  getById,
  create,
  markAsRead,
  markAllAsRead
}
