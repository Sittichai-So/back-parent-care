const express = require('express')
const controller = require('./user.controller')
const authMiddleware = require('../../interfaces/http/middlewares/auth.middleware')
const validationMiddleware = require('../../interfaces/http/middlewares/validation.middleware')
const { updateProfileSchema } = require('./user.schema')

const router = express.Router()

router.get('/profile', authMiddleware, controller.getProfile)
router.put('/profile', authMiddleware, validationMiddleware(updateProfileSchema), controller.updateProfile)
router.get('/lookup', authMiddleware, controller.lookupUser)
router.get('/me/pending-invites', authMiddleware, controller.getPendingInvites)

module.exports = router
