const { errorResponse } = require('../../../utils/response')

const validationMiddleware = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false })

    if (error) {
      const details = error.details.map((item) => item.message)
      return res.status(400).json(errorResponse('Validation failed', details))
    }

    next()
  }
}

module.exports = validationMiddleware
