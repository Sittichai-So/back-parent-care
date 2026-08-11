const Hospital = require('./hospital.model')

const findAll = async (filter = {}) => {
  return Hospital.find(filter).sort({ createdAt: -1 })
}

const findById = async (id) => {
  return Hospital.findById(id)
}

const create = async (data) => {
  return Hospital.create(data)
}

const updateById = async (id, data) => {
  return Hospital.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true
  })
}

const deleteById = async (id) => {
  return Hospital.findByIdAndDelete(id)
}

module.exports = {
  findAll,
  findById,
  create,
  updateById,
  deleteById
}
