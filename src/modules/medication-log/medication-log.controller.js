const { successResponse } = require('../../utils/response')
const service = require('./medication-log.service')

const getMedicationLogs = async (req, res, next) => {
  try {
    const data = await service.getAll(req.household._id, {
      memberId: req.query.memberId,
      status: req.query.status
    })
    res.json(successResponse(data))
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getMedicationLogs
}
