const Vital = require('./vital.model')

const findAll = async (filter = {}, { limit } = {}) => {
  const query = Vital.find(filter).sort({ recordedAt: -1 })
  if (limit) query.limit(limit)
  return query
}

const findById = async (id) => {
  return Vital.findById(id)
}

const create = async (data) => {
  return Vital.create(data)
}

const updateById = async (id, data) => {
  return Vital.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true
  })
}

const deleteById = async (id) => {
  return Vital.findByIdAndDelete(id)
}

module.exports = {
  findAll,
  findById,
  create,
  updateById,
  deleteById
}
