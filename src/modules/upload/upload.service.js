const uploadService = async (file) => {
  return {
    filename: file.filename,
    path: file.path
  }
}

module.exports = {
  uploadService
}
