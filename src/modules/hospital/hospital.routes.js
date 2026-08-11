const express = require('express')
const controller = require('./hospital.controller')
const authMiddleware = require('../../interfaces/http/middlewares/auth.middleware')
const validationMiddleware = require('../../interfaces/http/middlewares/validation.middleware')
const { hospitalSchema } = require('./hospital.schema')

const router = express.Router()

router.get('/', authMiddleware, controller.getHospitals)
router.post('/', authMiddleware, validationMiddleware(hospitalSchema), controller.createHospital)
router.get('/:id', authMiddleware, controller.getHospital)
router.put('/:id', authMiddleware, validationMiddleware(hospitalSchema), controller.updateHospital)
router.delete('/:id', authMiddleware, controller.deleteHospital)

module.exports = router
