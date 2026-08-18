const express = require('express')
const controller = require('./document.controller')
const requireHouseholdRole = require('../../interfaces/http/middlewares/require-household-role.middleware')
const validationMiddleware = require('../../interfaces/http/middlewares/validation.middleware')
const { documentCreateSchema, documentUpdateSchema } = require('./document.schema')

// Mounted with { mergeParams: true } under /households/:householdId/documents
const router = express.Router({ mergeParams: true })

// Readable by everyone including viewers — the design lists "ดูเอกสาร" as a
// granted permission on the members-and-access screen, and viewers are only
// blocked from mutating.
router.get('/', controller.getDocuments)

// Owner/caregiver only: an elder's own-data scope covers their medication and
// check-ins, not the household's shared paperwork.
router.post(
  '/',
  requireHouseholdRole('owner', 'caregiver'),
  validationMiddleware(documentCreateSchema),
  controller.createDocument
)
router.put(
  '/:documentId',
  requireHouseholdRole('owner', 'caregiver'),
  validationMiddleware(documentUpdateSchema),
  controller.updateDocument
)
router.delete('/:documentId', requireHouseholdRole('owner', 'caregiver'), controller.deleteDocument)

module.exports = router
