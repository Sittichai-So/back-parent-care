const repository = require('./vital.repository')
const timelineService = require('../timeline/timeline.service')
const { resolveWriteMemberId, assertOwnRecordOrPrivileged } = require('../../utils/household-scope')

const createError = (message, statusCode) => {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

const findOwned = async (id, householdId) => {
  const vital = await repository.findById(id)
  if (!vital || String(vital.householdId) !== String(householdId)) {
    throw createError('Vital record not found', 404)
  }
  return vital
}

const validateReadings = ({ systolic, diastolic, pulse, sugar, weight }) => {
  const hasBp = systolic != null || diastolic != null
  if (hasBp && (systolic == null || diastolic == null)) {
    throw createError('Blood pressure needs both a systolic and diastolic value', 400)
  }
  if (systolic == null && pulse == null && sugar == null && weight == null) {
    throw createError('At least one reading (blood pressure, pulse, sugar, or weight) is required', 400)
  }
}

const getAll = async (householdId, { memberId, limit } = {}) => {
  const filter = { householdId }
  if (memberId) filter.memberId = memberId
  return repository.findAll(filter, { limit })
}

const getById = async (id, householdId) => {
  return findOwned(id, householdId)
}

const createOne = async (householdId, membership, data) => {
  validateReadings(data)
  const memberId = resolveWriteMemberId(membership, data.memberId)

  const vital = await repository.create({ ...data, memberId, householdId, createdByMemberId: membership._id })

  await timelineService.recordEvent({
    householdId,
    actorMemberId: membership._id,
    relatedMemberId: memberId,
    type: 'vitals',
    title: 'บันทึกสุขภาพใหม่',
    detail: [
      vital.systolic && vital.diastolic ? `ความดัน ${vital.systolic}/${vital.diastolic}` : null,
      vital.pulse ? `ชีพจร ${vital.pulse}` : null,
      vital.sugar ? `น้ำตาล ${vital.sugar}` : null,
      vital.weight ? `น้ำหนัก ${vital.weight} กก.` : null
    ]
      .filter(Boolean)
      .join(' · '),
    relatedId: vital._id
  })

  return vital
}

const updateOne = async (id, householdId, membership, data) => {
  const existing = await findOwned(id, householdId)
  assertOwnRecordOrPrivileged(membership, existing.memberId)
  if (Object.keys(data).some((key) => ['systolic', 'diastolic', 'pulse', 'sugar', 'weight'].includes(key))) {
    validateReadings({ ...existing.toObject(), ...data })
  }
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
