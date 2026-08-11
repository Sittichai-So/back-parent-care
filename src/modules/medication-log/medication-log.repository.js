const MedicationLog = require('./medication-log.model')

const findAll = async (filter = {}) => {
  return MedicationLog.find(filter).sort({ takenAt: -1 })
}

const findById = async (id) => {
  return MedicationLog.findById(id)
}

const create = async (data) => {
  return MedicationLog.create(data)
}

// Drives the `lastTakenAt` field computed onto each Medicine at read time.
const findLatestTaken = async (medicineId) => {
  return MedicationLog.findOne({ medicineId, status: 'taken' }).sort({ takenAt: -1 })
}

module.exports = {
  findAll,
  findById,
  create,
  findLatestTaken
}
