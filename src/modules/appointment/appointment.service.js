const repository = require('./appointment.repository')
const timelineService = require('../timeline/timeline.service')
const { resolveWriteMemberId, assertOwnRecordOrPrivileged } = require('../../utils/household-scope')

const createError = (message, statusCode) => {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

const findOwned = async (id, householdId) => {
  const appointment = await repository.findById(id)
  if (!appointment || String(appointment.householdId) !== String(householdId)) {
    throw createError('ไม่พบนัดหมายนี้', 404)
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
  // owner/caregiver: memberId required, may target anyone. elder: only
  // themself (an omitted memberId defaults to self; anyone else is rejected).
  const memberId = resolveWriteMemberId(membership, data.memberId)
  const appointment = await repository.create({ ...data, memberId, householdId, createdByMemberId: membership._id })

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

const updateOne = async (id, householdId, membership, data) => {
  const existing = await findOwned(id, householdId)
  assertOwnRecordOrPrivileged(membership, existing.memberId)
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
