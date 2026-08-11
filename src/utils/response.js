const successResponse = (data = null, message = 'Success', meta = null) => ({
  success: true,
  message,
  data,
  ...(meta ? { pagination: meta } : {})
})

const errorResponse = (message = 'Something went wrong', errors = []) => ({
  success: false,
  message,
  errors
})

module.exports = {
  successResponse,
  errorResponse
}
