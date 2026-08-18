const Joi = require('joi')

// Used for POST /medicines/:medicineId/logs — medicineId comes from the
// route and memberId is resolved server-side from the caller's household
// role (see src/utils/household-scope.js), so neither is accepted here.
const medicationLogCreateSchema = Joi.object({
  status: Joi.string().valid('taken', 'missed', 'skipped').required(),
  takenAt: Joi.date().optional(),
  image: Joi.string().uri().optional().allow('', null),
  // When the photo was shot, as opposed to takenAt (when the dose was
  // confirmed) — the design shows the two as separate rows.
  photoTakenAt: Joi.date().optional().allow(null),
  note: Joi.string().optional().allow('', null)
})

module.exports = {
  medicationLogCreateSchema
}
