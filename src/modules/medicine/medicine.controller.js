const { successResponse } = require('../../utils/response')
const service = require('./medicine.service')

const getMedicines = async (req, res, next) => {
  try {
    const data = await service.getAll(req.household._id, { memberId: req.query.memberId })
    res.json(successResponse(data))
  } catch (error) {
    next(error)
  }
}

const getMedicine = async (req, res, next) => {
  try {
    const data = await service.getById(req.params.medicineId, req.household._id)
    res.json(successResponse(data))
  } catch (error) {
    next(error)
  }
}

const createMedicine = async (req, res, next) => {
  try {
    const data = await service.createOne(req.household._id, req.membership, req.body)
    res.status(201).json(successResponse(data, 'Created successfully'))
  } catch (error) {
    next(error)
  }
}

const updateMedicine = async (req, res, next) => {
  try {
    const data = await service.updateOne(req.params.medicineId, req.household._id, req.membership, req.body)
    res.json(successResponse(data, 'Updated successfully'))
  } catch (error) {
    next(error)
  }
}

const deleteMedicine = async (req, res, next) => {
  try {
    await service.deleteOne(req.params.medicineId, req.household._id)
    res.json(successResponse(null, 'Deleted successfully'))
  } catch (error) {
    next(error)
  }
}

const logDose = async (req, res, next) => {
  try {
    const data = await service.logDose(req.params.medicineId, req.household._id, req.membership, req.body)
    res.status(201).json(successResponse(data, 'Logged successfully'))
  } catch (error) {
    next(error)
  }
}

const getLogs = async (req, res, next) => {
  try {
    const data = await service.listLogs(req.params.medicineId, req.household._id)
    res.json(successResponse(data))
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getMedicines,
  getMedicine,
  createMedicine,
  updateMedicine,
  deleteMedicine,
  logDose,
  getLogs
}
