const express = require('express')
const controller = require('./medicine.controller')
const requireHouseholdRole = require('../../interfaces/http/middlewares/require-household-role.middleware')
const validationMiddleware = require('../../interfaces/http/middlewares/validation.middleware')
const { medicineSchema } = require('./medicine.schema')
const { medicationLogCreateSchema } = require('../medication-log/medication-log.schema')

// Mounted with { mergeParams: true } under /households/:householdId/medicines
const router = express.Router({ mergeParams: true })

router.get('/', controller.getMedicines)
// Not role-restricted — elders may add/edit their own medicines; medicine.service.js narrows to "self only".
router.post('/', validationMiddleware(medicineSchema), controller.createMedicine)
router.get('/:medicineId', controller.getMedicine)
router.put('/:medicineId', validationMiddleware(medicineSchema), controller.updateMedicine)
// Deletion stays above elders' self-write scope, same as vitals.
router.delete('/:medicineId', requireHouseholdRole('owner', 'caregiver'), controller.deleteMedicine)

router.get('/:medicineId/logs', controller.getLogs)
// Not role-restricted — elders may log their own doses; logDose narrows to "self only".
router.post('/:medicineId/logs', validationMiddleware(medicationLogCreateSchema), controller.logDose)

module.exports = router
