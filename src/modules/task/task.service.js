const repository = require('./task.repository')
const timelineService = require('../timeline/timeline.service')
const { assertOwnRecordOrPrivileged } = require('../../utils/household-scope')

const createError = (message, statusCode) => {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

const findOwned = async (id, householdId) => {
  const task = await repository.findById(id)
  if (!task || String(task.householdId) !== String(householdId)) {
    throw createError('ไม่พบงานนี้', 404)
  }
  return task
}

const assignedId = (task) => (task.assignedToMemberId ? task.assignedToMemberId._id || task.assignedToMemberId : null)

const getAll = async (householdId, { status, assignedToMemberId } = {}) => {
  const filter = { householdId }
  if (status) filter.status = status
  if (assignedToMemberId) filter.assignedToMemberId = assignedToMemberId
  return repository.findAll(filter)
}

const createOne = async (householdId, membership, data) => {
  const task = await repository.create({ ...data, householdId, createdByMemberId: membership._id })

  await timelineService.recordEvent({
    householdId,
    actorMemberId: membership._id,
    relatedMemberId: task.assignedToMemberId,
    type: 'task',
    title: `งานใหม่: ${task.title}`,
    detail: task.detail,
    relatedId: task._id
  })

  return repository.findById(task._id)
}

const updateOne = async (id, householdId, data) => {
  await findOwned(id, householdId)
  return repository.updateById(id, data)
}

const updateStatus = async (id, householdId, membership, status) => {
  const task = await findOwned(id, householdId)
  assertOwnRecordOrPrivileged(membership, assignedId(task))

  const updated = await repository.updateById(id, { status })

  await timelineService.recordEvent({
    householdId,
    actorMemberId: membership._id,
    relatedMemberId: assignedId(updated),
    type: 'task',
    title: `งาน "${updated.title}" เปลี่ยนเป็น ${status}`,
    relatedId: updated._id
  })

  return updated
}

const deleteOne = async (id, householdId) => {
  await findOwned(id, householdId)
  return repository.deleteById(id)
}

module.exports = {
  getAll,
  createOne,
  updateOne,
  updateStatus,
  deleteOne
}
