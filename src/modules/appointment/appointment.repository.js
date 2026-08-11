const Appointment = require('./appointment.model')

const findAll = async (filter = {}) => {
  return Appointment.find(filter).sort({ date: 1, time: 1 })
}

const findById = async (id) => {
  return Appointment.findById(id)
}

const create = async (data) => {
  return Appointment.create(data)
}

const updateById = async (id, data) => {
  return Appointment.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true
  })
}

const deleteById = async (id) => {
  return Appointment.findByIdAndDelete(id)
}

module.exports = {
  findAll,
  findById,
  create,
  updateById,
  deleteById
}
