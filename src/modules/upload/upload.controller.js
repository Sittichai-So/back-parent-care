const { successResponse } = require('../../utils/response')

const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      const error = new Error('กรุณาแนบไฟล์')
      error.statusCode = 400
      throw error
    }

    const fileUrl = `/uploads/${req.file.filename}`
    res.status(201).json(successResponse({ url: fileUrl }, 'Upload successful'))
  } catch (error) {
    next(error)
  }
}

module.exports = {
  uploadFile
}
