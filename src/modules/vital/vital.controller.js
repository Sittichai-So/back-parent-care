const { successResponse } = require('../../utils/response')
const service = require('./vital.service')

const getVitals = async (req, res, next) => {
  try {
    const data = await service.getAll(req.household._id, {
      memberId: req.query.memberId,
      limit: req.query.limit ? Number(req.query.limit) : undefined
    })
    res.json(successResponse(data))
  } catch (error) {
    next(error)
  }
}

const getVital = async (req, res, next) => {
  try {
    const data = await service.getById(req.params.vitalId, req.household._id)
    res.json(successResponse(data))
  } catch (error) {
    next(error)
  }
}

const createVital = async (req, res, next) => {
  try {
    const data = await service.createOne(req.household._id, req.membership, req.body)
    res.status(201).json(successResponse(data, 'Recorded successfully'))
  } catch (error) {
    next(error)
  }
}

const updateVital = async (req, res, next) => {
  try {
    const data = await service.updateOne(req.params.vitalId, req.household._id, req.membership, req.body)
    res.json(successResponse(data, 'Updated successfully'))
  } catch (error) {
    next(error)
  }
}

const deleteVital = async (req, res, next) => {
  try {
    await service.deleteOne(req.params.vitalId, req.household._id)
    res.json(successResponse(null, 'Deleted successfully'))
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getVitals,
  getVital,
  createVital,
  updateVital,
  deleteVital
}
