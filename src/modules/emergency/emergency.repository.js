const EmergencyAlert = require('./emergency.model')

const findAll = async (filter = {}, { limit } = {}) => {
  const query = EmergencyAlert.find(filter).sort({ createdAt: -1 })
  if (limit) query.limit(limit)
  return query
}

const findById = async (id) => {
  return EmergencyAlert.findById(id)
}

const create = async (data) => {
  return EmergencyAlert.create(data)
}

const updateById = async (id, data) => {
  return EmergencyAlert.findByIdAndUpdate(id, data, {
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
