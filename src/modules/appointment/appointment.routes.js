const express = require('express')
const controller = require('./appointment.controller')
const requireHouseholdRole = require('../../interfaces/http/middlewares/require-household-role.middleware')
const validationMiddleware = require('../../interfaces/http/middlewares/validation.middleware')
const { appointmentSchema } = require('./appointment.schema')

// Mounted with { mergeParams: true } under /households/:householdId/appointments
const router = express.Router({ mergeParams: true })

router.get('/', controller.getAppointments)
router.post('/', requireHouseholdRole('owner', 'caregiver'), validationMiddleware(appointmentSchema), controller.createAppointment)
router.get('/:appointmentId', controller.getAppointment)
router.put('/:appointmentId', requireHouseholdRole('owner', 'caregiver'), validationMiddleware(appointmentSchema), controller.updateAppointment)
router.delete('/:appointmentId', requireHouseholdRole('owner', 'caregiver'), controller.deleteAppointment)

module.exports = router
