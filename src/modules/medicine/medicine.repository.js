const Medicine = require('./medicine.model')

const findAll = async (filter = {}) => {
  return Medicine.find(filter).sort({ createdAt: -1 })
}

const findById = async (id) => {
  return Medicine.findById(id)
}

const create = async (data) => {
  return Medicine.create(data)
}

const updateById = async (id, data) => {
  return Medicine.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true
  })
}

const deleteById = async (id) => {
  return Medicine.findByIdAndDelete(id)
}

module.exports = {
  findAll,
  findById,
  create,
  updateById,
  deleteById
}
