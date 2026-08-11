const express = require('express')
const controller = require('./auth.controller')
const validationMiddleware = require('../../interfaces/http/middlewares/validation.middleware')
const { registerSchema, loginSchema } = require('./auth.schema')

const router = express.Router()

router.post('/register', validationMiddleware(registerSchema), controller.register)
router.post('/login', validationMiddleware(loginSchema), controller.login)

module.exports = router
