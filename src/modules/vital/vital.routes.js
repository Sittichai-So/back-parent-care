const express = require('express')
const controller = require('./vital.controller')
const requireHouseholdRole = require('../../interfaces/http/middlewares/require-household-role.middleware')
const validationMiddleware = require('../../interfaces/http/middlewares/validation.middleware')
const { vitalCreateSchema, vitalUpdateSchema } = require('./vital.schema')

// Mounted with { mergeParams: true } under /households/:householdId/vitals
const router = express.Router({ mergeParams: true })

router.get('/', controller.getVitals)
// Not role-restricted here — elders may log their own vitals;
// vital.service.js narrows writes to "self only" for that role.
router.post('/', validationMiddleware(vitalCreateSchema), controller.createVital)
router.get('/:vitalId', controller.getVital)
router.patch('/:vitalId', validationMiddleware(vitalUpdateSchema), controller.updateVital)
// Deletion stays above elders' self-write scope, deliberately.
router.delete('/:vitalId', requireHouseholdRole('owner', 'caregiver'), controller.deleteVital)

module.exports = router
