const express = require('express')
const controller = require('./notification.controller')
const authMiddleware = require('../../interfaces/http/middlewares/auth.middleware')

const router = express.Router()

router.get('/', authMiddleware, controller.getNotifications)
router.put('/:id/read', authMiddleware, controller.readNotification)
router.put('/read-all', authMiddleware, controller.readAllNotifications)

module.exports = router
