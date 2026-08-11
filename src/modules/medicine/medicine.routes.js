const express = require('express')
const controller = require('./medicine.controller')
const requireHouseholdRole = require('../../interfaces/http/middlewares/require-household-role.middleware')
const validationMiddleware = require('../../interfaces/http/middlewares/validation.middleware')
const { medicineSchema } = require('./medicine.schema')
const { medicationLogCreateSchema } = require('../medication-log/medication-log.schema')

// Mounted with { mergeParams: true } under /households/:householdId/medicines
const router = express.Router({ mergeParams: true })

router.get('/', controller.getMedicines)
router.post('/', requireHouseholdRole('owner', 'caregiver'), validationMiddleware(medicineSchema), controller.createMedicine)
router.get('/:medicineId', controller.getMedicine)
router.put('/:medicineId', requireHouseholdRole('owner', 'caregiver'), validationMiddleware(medicineSchema), controller.updateMedicine)
router.delete('/:medicineId', requireHouseholdRole('owner', 'caregiver'), controller.deleteMedicine)

router.get('/:medicineId/logs', controller.getLogs)
// Not role-restricted to owner/caregiver here — elders may log their own
// doses; medicine.service.js#logDose enforces the "self only" narrowing.
router.post('/:medicineId/logs', validationMiddleware(medicationLogCreateSchema), controller.logDose)

module.exports = router
