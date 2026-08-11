const Joi = require('joi')

// memberId is optional here — omitted means "for myself", resolved
// server-side (see src/utils/household-scope.js#resolveWriteMemberId).
// The "at least one reading" / "BP needs both values" business rules are
// enforced in vital.service.js, where a clearer error message can be given
// than a generic Joi schema violation.
const vitalCreateSchema = Joi.object({
  memberId: Joi.string().optional(),
  recordedAt: Joi.date().optional(),
  systolic: Joi.number().optional().allow(null),
  diastolic: Joi.number().optional().allow(null),
  sugar: Joi.number().optional().allow(null),
  weight: Joi.number().optional().allow(null),
  note: Joi.string().optional().allow('', null)
})

const vitalUpdateSchema = Joi.object({
  recordedAt: Joi.date().optional(),
  systolic: Joi.number().optional().allow(null),
  diastolic: Joi.number().optional().allow(null),
  sugar: Joi.number().optional().allow(null),
  weight: Joi.number().optional().allow(null),
  note: Joi.string().optional().allow('', null)
}).min(1)

module.exports = {
  vitalCreateSchema,
  vitalUpdateSchema
}
