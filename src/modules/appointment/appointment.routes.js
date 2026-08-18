const express = require('express')
const controller = require('./appointment.controller')
const requireHouseholdRole = require('../../interfaces/http/middlewares/require-household-role.middleware')
const validationMiddleware = require('../../interfaces/http/middlewares/validation.middleware')
const { appointmentSchema } = require('./appointment.schema')

// Mounted with { mergeParams: true } under /households/:householdId/appointments
const router = express.Router({ mergeParams: true })

router.get('/', controller.getAppointments)
// Not role-restricted — elders may book/edit their own appointments; appointment.service.js narrows to "self only".
router.post('/', validationMiddleware(appointmentSchema), controller.createAppointment)
router.get('/:appointmentId', controller.getAppointment)
router.put('/:appointmentId', validationMiddleware(appointmentSchema), controller.updateAppointment)
// Deletion stays above elders' self-write scope, same as vitals/medicines.
router.delete('/:appointmentId', requireHouseholdRole('owner', 'caregiver'), controller.deleteAppointment)

module.exports = router
