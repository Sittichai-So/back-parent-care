const { successResponse } = require('../../utils/response')
const service = require('./timeline.service')

const getTimeline = async (req, res, next) => {
  try {
    const { limit, before } = req.query
    const data = await service.listRecent(req.household._id, {
      limit: limit ? Number(limit) : undefined,
      before
    })
    res.json(successResponse(data))
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getTimeline
}
