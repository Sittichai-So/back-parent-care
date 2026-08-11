const { successResponse } = require('../../utils/response')
const service = require('./auth.service')

const register = async (req, res, next) => {
  try {
    const { user, token } = await service.register(req.body)
    res.status(201).json(successResponse({ user, token }, 'Register successful'))
  } catch (error) {
    next(error)
  }
}

const login = async (req, res, next) => {
  try {
    const { user, token } = await service.login(req.body)
    res.json(successResponse({ user, token }, 'Login successful'))
  } catch (error) {
    next(error)
  }
}

module.exports = {
  register,
  login
}
