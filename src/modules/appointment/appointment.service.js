const repository = require('./appointment.repository')
const timelineService = require('../timeline/timeline.service')

const createError = (message, statusCode) => {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

const findOwned = async (id, householdId) => {
  const appointment = await repository.findById(id)
  if (!appointment || String(appointment.householdId) !== String(householdId)) {
    throw createError('Appointment not found', 404)
  }
  return appointment
}

const getAll = async (householdId, { memberId } = {}) => {
  const filter = { householdId }
  if (memberId) filter.memberId = memberId
  return repository.findAll(filter)
}

const getById = async (id, householdId) => {
  return findOwned(id, householdId)
}

const createOne = async (householdId, membership, data) => {
  const appointment = await repository.create({ ...data, householdId, createdByMemberId: membership._id })

  await timelineService.recordEvent({
    householdId,
    actorMemberId: membership._id,
    relatedMemberId: appointment.memberId,
    type: 'appointment',
    title: `เพิ่มนัดหมาย: ${appointment.title}`,
    detail: `${appointment.hospital} · ${appointment.date}`,
    relatedId: appointment._id
  })

  return appointment
}

const updateOne = async (id, householdId, data) => {
  await findOwned(id, householdId)
  return repository.updateById(id, data)
}

const deleteOne = async (id, householdId) => {
  await findOwned(id, householdId)
  return repository.deleteById(id)
}

module.exports = {
  getAll,
  getById,
  createOne,
  updateOne,
  deleteOne
}
