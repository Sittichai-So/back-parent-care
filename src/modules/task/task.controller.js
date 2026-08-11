const { successResponse } = require('../../utils/response')
const service = require('./task.service')

const getTasks = async (req, res, next) => {
  try {
    const data = await service.getAll(req.household._id, {
      status: req.query.status,
      assignedToMemberId: req.query.assignedToMemberId
    })
    res.json(successResponse(data))
  } catch (error) {
    next(error)
  }
}

const createTask = async (req, res, next) => {
  try {
    const data = await service.createOne(req.household._id, req.membership, req.body)
    res.status(201).json(successResponse(data, 'Created successfully'))
  } catch (error) {
    next(error)
  }
}

const updateTask = async (req, res, next) => {
  try {
    const data = await service.updateOne(req.params.taskId, req.household._id, req.body)
    res.json(successResponse(data, 'Updated successfully'))
  } catch (error) {
    next(error)
  }
}

const updateTaskStatus = async (req, res, next) => {
  try {
    const data = await service.updateStatus(req.params.taskId, req.household._id, req.membership, req.body.status)
    res.json(successResponse(data, 'Status updated'))
  } catch (error) {
    next(error)
  }
}

const deleteTask = async (req, res, next) => {
  try {
    await service.deleteOne(req.params.taskId, req.household._id)
    res.json(successResponse(null, 'Deleted successfully'))
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getTasks,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask
}
