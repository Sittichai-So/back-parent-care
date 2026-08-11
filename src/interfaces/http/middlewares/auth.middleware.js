const jwt = require('jsonwebtoken')
const { errorResponse } = require('../../../utils/response')

const authMiddleware = (req, res, next) => {
  const authorization = req.headers.authorization || ''
  const token = authorization.startsWith('Bearer ') ? authorization.split(' ')[1] : null

  if (!token) {
    return res.status(401).json(errorResponse('Authentication required'))
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch (error) {
    return res.status(401).json(errorResponse('Invalid or expired token'))
  }
}

module.exports = authMiddleware
