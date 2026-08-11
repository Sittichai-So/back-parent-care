const express = require('express')
const controller = require('./emergency.controller')
const validationMiddleware = require('../../interfaces/http/middlewares/validation.middleware')
const { triggerEmergencySchema } = require('./emergency.schema')

// Mounted with { mergeParams: true } under /households/:householdId/emergency
const router = express.Router({ mergeParams: true })

// Not role-restricted beyond "not viewer" (enforced in
// emergency.service.js#trigger) — elder self-trigger, or owner/caregiver on
// behalf of any member.
router.post('/trigger', validationMiddleware(triggerEmergencySchema), controller.trigger)
router.get('/recent', controller.listRecent)
router.patch('/:alertId/resolve', controller.resolveAlert)

module.exports = router
