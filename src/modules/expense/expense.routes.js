const express = require('express')
const controller = require('./expense.controller')
const requireHouseholdRole = require('../../interfaces/http/middlewares/require-household-role.middleware')
const validationMiddleware = require('../../interfaces/http/middlewares/validation.middleware')
const { expenseCreateSchema, expenseUpdateSchema } = require('./expense.schema')

// Mounted with { mergeParams: true } under /households/:householdId/expenses
const router = express.Router({ mergeParams: true })

// Registered before '/:expenseId' would be — otherwise 'summary' reads as an
// id. (There is no GET '/:expenseId' route today, but the ordering keeps
// adding one from silently shadowing this.)
router.get('/summary', controller.getExpenseSummary)
router.get('/', controller.getExpenses)

// Owner/caregiver only. The design shows spending on the caregiver/admin
// dashboard and never in the elder tree, whose scope is that person's own
// medication and check-ins.
router.post(
  '/',
  requireHouseholdRole('owner', 'caregiver'),
  validationMiddleware(expenseCreateSchema),
  controller.createExpense
)
router.put(
  '/:expenseId',
  requireHouseholdRole('owner', 'caregiver'),
  validationMiddleware(expenseUpdateSchema),
  controller.updateExpense
)
router.delete('/:expenseId', requireHouseholdRole('owner', 'caregiver'), controller.deleteExpense)

module.exports = router
