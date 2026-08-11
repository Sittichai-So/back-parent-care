const { successResponse } = require('../../utils/response')
const service = require('./hospital.service')

const getHospitals = async (req, res, next) => {
  try {
    const data = await service.getAll()
    res.json(successResponse(data))
  } catch (error) {
    next(error)
  }
}

const getHospital = async (req, res, next) => {
  try {
    const data = await service.getById(req.params.id)
    res.json(successResponse(data))
  } catch (error) {
    next(error)
  }
}

const createHospital = async (req, res, next) => {
  try {
    const data = await service.createOne(req.body)
    res.status(201).json(successResponse(data, 'Created successfully'))
  } catch (error) {
    next(error)
  }
}

const updateHospital = async (req, res, next) => {
  try {
    const data = await service.updateOne(req.params.id, req.body)
    res.json(successResponse(data, 'Updated successfully'))
  } catch (error) {
    next(error)
  }
}

const deleteHospital = async (req, res, next) => {
  try {
    await service.deleteOne(req.params.id)
    res.json(successResponse(null, 'Deleted successfully'))
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getHospitals,
  getHospital,
  createHospital,
  updateHospital,
  deleteHospital
}
