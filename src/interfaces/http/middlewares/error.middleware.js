const { errorResponse } = require('../../../utils/response')

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500
  const message = err.message || 'เกิดข้อผิดพลาดของระบบ กรุณาลองใหม่อีกครั้ง'
  const errors = err.errors || []
  res.status(statusCode).json(errorResponse(message, errors))
}

const notFoundHandler = (req, res, next) => {
  res.status(404).json(errorResponse('ไม่พบเส้นทางที่ร้องขอ'))
}

module.exports = {
  errorHandler,
  notFoundHandler
}
