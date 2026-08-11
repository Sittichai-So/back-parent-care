const express = require('express')
const authMiddleware = require('../../interfaces/http/middlewares/auth.middleware')
const householdMiddleware = require('../../interfaces/http/middlewares/household.middleware')
const requireHouseholdRole = require('../../interfaces/http/middlewares/require-household-role.middleware')
const validationMiddleware = require('../../interfaces/http/middlewares/validation.middleware')
const { createHouseholdSchema, joinHouseholdSchema, renameHouseholdSchema, claimHouseholdSchema } = require('./household.schema')
const controller = require('./household.controller')
const memberController = require('./household-member.controller')
const memberRoutes = require('./household-member.routes')
const timelineRoutes = require('../timeline/timeline.routes')
const medicineRoutes = require('../medicine/medicine.routes')
const medicationLogRoutes = require('../medication-log/medication-log.routes')
const appointmentRoutes = require('../appointment/appointment.routes')
const vitalRoutes = require('../vital/vital.routes')
const taskRoutes = require('../task/task.routes')
const emergencyRoutes = require('../emergency/emergency.routes')

const router = express.Router()

router.use(authMiddleware)

router.post('/', validationMiddleware(createHouseholdSchema), controller.createHousehold)
router.post('/join', validationMiddleware(joinHouseholdSchema), controller.joinHousehold)
router.post('/claim', validationMiddleware(claimHouseholdSchema), memberController.claimMember)
router.get('/mine', controller.listMyHouseholds)

// Deliberately registered ahead of the householdMiddleware-gated block below:
// the person accepting/declining doesn't have an active membership in this
// household yet (that's the whole point), so householdMiddleware would 403
// them before these ever ran. Ownership of the invite (req.user.id must
// match the invited member's userId) is checked inside the service instead.
router.post('/:householdId/members/:memberId/accept', memberController.acceptInvite)
router.post('/:householdId/members/:memberId/decline', memberController.declineInvite)

router.get('/:householdId', householdMiddleware, controller.getHousehold)
router.patch(
  '/:householdId',
  householdMiddleware,
  requireHouseholdRole('owner'),
  validationMiddleware(renameHouseholdSchema),
  controller.renameHousehold
)
router.post(
  '/:householdId/invite-code/rotate',
  householdMiddleware,
  requireHouseholdRole('owner'),
  controller.rotateInviteCode
)

router.use('/:householdId/members', householdMiddleware, memberRoutes)
router.use('/:householdId/timeline', householdMiddleware, timelineRoutes)
router.use('/:householdId/medicines', householdMiddleware, medicineRoutes)
router.use('/:householdId/medication-logs', householdMiddleware, medicationLogRoutes)
router.use('/:householdId/appointments', householdMiddleware, appointmentRoutes)
router.use('/:householdId/vitals', householdMiddleware, vitalRoutes)
router.use('/:householdId/tasks', householdMiddleware, taskRoutes)
router.use('/:householdId/emergency', householdMiddleware, emergencyRoutes)

module.exports = router
