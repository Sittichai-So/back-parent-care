const repository = require('./hospital.repository')

const getAll = async () => {
  return repository.findAll()
}

const getById = async (id) => {
  return repository.findById(id)
}

const createOne = async (data) => {
  return repository.create(data)
}

const updateOne = async (id, data) => {
  return repository.updateById(id, data)
}

const deleteOne = async (id) => {
  return repository.deleteById(id)
}

module.exports = {
  getAll,
  getById,
  createOne,
  updateOne,
  deleteOne
}
