const { successResponse, errorResponse } = require('../../utils/response')
const service = require('./user.service')
const { lookupUserSchema } = require('./user.schema')

const getProfile = async (req, res, next) => {
  try {
    const profile = await service.getProfile(req.user.id)
    res.json(successResponse(profile))
  } catch (error) {
    next(error)
  }
}

const updateProfile = async (req, res, next) => {
  try {
    const profile = await service.updateProfile(req.user.id, req.body)
    res.json(successResponse(profile, 'Profile updated successfully'))
  } catch (error) {
    next(error)
  }
}

// Query-string input, so it's validated here rather than via
// validationMiddleware (which only validates req.body).
const lookupUser = async (req, res, next) => {
  try {
    const { error, value } = lookupUserSchema.validate(req.query, { abortEarly: false })
    if (error) {
      return res.status(400).json(errorResponse('Validation failed', error.details.map((item) => item.message)))
    }

    const data = await service.lookupUser(value)
    res.json(successResponse(data))
  } catch (error) {
    next(error)
  }
}

const getPendingInvites = async (req, res, next) => {
  try {
    const data = await service.listPendingInvites(req.user.id)
    res.json(successResponse(data))
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getProfile,
  updateProfile,
  lookupUser,
  getPendingInvites
}
