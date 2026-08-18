const repository = require('./medicine.repository')
const medicationLogRepository = require('../medication-log/medication-log.repository')
const timelineService = require('../timeline/timeline.service')
const { resolveWriteMemberId, assertOwnRecordOrPrivileged } = require('../../utils/household-scope')

const createError = (message, statusCode) => {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

const findOwned = async (id, householdId) => {
  const medicine = await repository.findById(id)
  if (!medicine || String(medicine.householdId) !== String(householdId)) {
    throw createError('ไม่พบรายการยานี้', 404)
  }
  return medicine
}

// The frontend's Medication type carries `lastTakenAt`, but we don't store
// it on Medicine — it's derived from the latest 'taken' MedicationLog so it
// can never drift out of sync with the actual log history.
const withLastTaken = async (medicines) => {
  const list = Array.isArray(medicines) ? medicines : [medicines]
  const enriched = await Promise.all(
    list.map(async (medicine) => {
      const lastLog = await medicationLogRepository.findLatestTaken(medicine._id)
      const plain = medicine.toObject ? medicine.toObject() : medicine
      return { ...plain, lastTakenAt: lastLog ? lastLog.takenAt : null }
    })
  )
  return Array.isArray(medicines) ? enriched : enriched[0]
}

const getAll = async (householdId, { memberId } = {}) => {
  const filter = { householdId }
  if (memberId) filter.memberId = memberId
  return withLastTaken(await repository.findAll(filter))
}

const getById = async (id, householdId) => {
  return withLastTaken(await findOwned(id, householdId))
}

const createOne = async (householdId, membership, data) => {
  // owner/caregiver: memberId required, may target anyone. elder: only
  // themself (an omitted memberId defaults to self; anyone else is rejected).
  const memberId = resolveWriteMemberId(membership, data.memberId)
  const medicine = await repository.create({ ...data, memberId, householdId, createdByMemberId: membership._id })
  return withLastTaken(medicine)
}

const updateOne = async (id, householdId, membership, data) => {
  const existing = await findOwned(id, householdId)
  assertOwnRecordOrPrivileged(membership, existing.memberId)
  return withLastTaken(await repository.updateById(id, data))
}

const deleteOne = async (id, householdId) => {
  await findOwned(id, householdId)
  return repository.deleteById(id)
}

// Confirming a dose is always "for the medicine's own member" — there's no
// separate member picker in the frontend's confirm flow — so the target
// member is derived from the medicine itself, then permission-checked via
// resolveWriteMemberId (owner/caregiver: anyone; elder: only their own).
const logDose = async (medicineId, householdId, membership, data) => {
  const medicine = await findOwned(medicineId, householdId)
  const memberId = resolveWriteMemberId(membership, String(medicine.memberId))

  const log = await medicationLogRepository.create({
    status: data.status,
    takenAt: data.takenAt,
    image: data.image,
    photoTakenAt: data.photoTakenAt,
    note: data.note,
    medicineId,
    memberId,
    householdId,
    createdByUserId: membership.userId,
    createdByMemberId: membership._id
  })

  await timelineService.recordEvent({
    householdId,
    actorMemberId: membership._id,
    relatedMemberId: memberId,
    type: 'medication',
    title: `ยืนยันทานยา: ${medicine.name}`,
    detail: medicine.dosage,
    relatedId: log._id
  })

  return log
}

const listLogs = async (medicineId, householdId) => {
  await findOwned(medicineId, householdId)
  return medicationLogRepository.findAll({ medicineId })
}

module.exports = {
  getAll,
  getById,
  createOne,
  updateOne,
  deleteOne,
  logDose,
  listLogs
}
