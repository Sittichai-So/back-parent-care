const express = require('express')
const controller = require('./handoff-note.controller')
const requireHouseholdRole = require('../../interfaces/http/middlewares/require-household-role.middleware')
const validationMiddleware = require('../../interfaces/http/middlewares/validation.middleware')
const { handoffNoteCreateSchema } = require('./handoff-note.schema')

// Mounted with { mergeParams: true } under /households/:householdId/handoff-notes
const router = express.Router({ mergeParams: true })

router.get('/', controller.getHandoffNotes)

// "add handoff note" is one of the actions the design gates for viewers.
router.post(
  '/',
  requireHouseholdRole('owner', 'caregiver', 'elder'),
  validationMiddleware(handoffNoteCreateSchema),
  controller.createHandoffNote
)

router.delete('/:noteId', controller.deleteHandoffNote)

module.exports = router
