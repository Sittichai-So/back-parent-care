const express = require('express')
const upload = require('../../interfaces/http/middlewares/upload.middleware')
const controller = require('./upload.controller')

const router = express.Router()

router.post('/', upload.single('file'), controller.uploadFile)

module.exports = router
