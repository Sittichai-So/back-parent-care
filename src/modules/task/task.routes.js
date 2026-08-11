const express = require('express')
const controller = require('./task.controller')
const requireHouseholdRole = require('../../interfaces/http/middlewares/require-household-role.middleware')
const validationMiddleware = require('../../interfaces/http/middlewares/validation.middleware')
const { taskCreateSchema, taskUpdateSchema, taskStatusSchema } = require('./task.schema')

// Mounted with { mergeParams: true } under /households/:householdId/tasks
const router = express.Router({ mergeParams: true })

router.get('/', controller.getTasks)
router.post('/', requireHouseholdRole('owner', 'caregiver'), validationMiddleware(taskCreateSchema), controller.createTask)
router.put('/:taskId', requireHouseholdRole('owner', 'caregiver'), validationMiddleware(taskUpdateSchema), controller.updateTask)
// Not role-restricted here — elders may update the status of a task
// assigned to them; task.service.js narrows via assertOwnRecordOrPrivileged.
router.patch('/:taskId/status', validationMiddleware(taskStatusSchema), controller.updateTaskStatus)
router.delete('/:taskId', requireHouseholdRole('owner', 'caregiver'), controller.deleteTask)

module.exports = router
