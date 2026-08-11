const { successResponse } = require('../../utils/response')
const service = require('./emergency.service')

const trigger = async (req, res, next) => {
  try {
    const data = await service.trigger(req.household._id, req.membership, req.body)
    res.status(201).json(successResponse(data, 'Emergency alert sent'))
  } catch (error) {
    next(error)
  }
}

const listRecent = async (req, res, next) => {
  try {
    const data = await service.listRecent(req.household._id, {
      limit: req.query.limit ? Number(req.query.limit) : undefined
    })
    res.json(successResponse(data))
  } catch (error) {
    next(error)
  }
}

const resolveAlert = async (req, res, next) => {
  try {
    const data = await service.resolve(req.params.alertId, req.household._id, req.membership)
    res.json(successResponse(data, 'Alert resolved'))
  } catch (error) {
    next(error)
  }
}

module.exports = {
  trigger,
  listRecent,
  resolveAlert
}
