const { successResponse } = require('../../utils/response')
const service = require('./appointment.service')

const getAppointments = async (req, res, next) => {
  try {
    const data = await service.getAll(req.household._id, { memberId: req.query.memberId })
    res.json(successResponse(data))
  } catch (error) {
    next(error)
  }
}

const getAppointment = async (req, res, next) => {
  try {
    const data = await service.getById(req.params.appointmentId, req.household._id)
    res.json(successResponse(data))
  } catch (error) {
    next(error)
  }
}

const createAppointment = async (req, res, next) => {
  try {
    const data = await service.createOne(req.household._id, req.membership, req.body)
    res.status(201).json(successResponse(data, 'Created successfully'))
  } catch (error) {
    next(error)
  }
}

const updateAppointment = async (req, res, next) => {
  try {
    const data = await service.updateOne(req.params.appointmentId, req.household._id, req.membership, req.body)
    res.json(successResponse(data, 'Updated successfully'))
  } catch (error) {
    next(error)
  }
}

const deleteAppointment = async (req, res, next) => {
  try {
    await service.deleteOne(req.params.appointmentId, req.household._id)
    res.json(successResponse(null, 'Deleted successfully'))
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getAppointments,
  getAppointment,
  createAppointment,
  updateAppointment,
  deleteAppointment
}
