const { errorResponse } = require('../../../utils/response')

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500
  const message = err.message || 'Internal server error'
  const errors = err.errors || []
  res.status(statusCode).json(errorResponse(message, errors))
}

const notFoundHandler = (req, res, next) => {
  res.status(404).json(errorResponse('Route not found'))
}

module.exports = {
  errorHandler,
  notFoundHandler
}
