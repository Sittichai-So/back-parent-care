const Joi = require('joi')

// The design's group kinds: บ้านพ่อแม่ · บ้านแฟน · บ้านญาติ · บ้านอื่น.
const HOUSEHOLD_KINDS = ['parents', 'partner', 'relatives', 'other']

const createHouseholdSchema = Joi.object({
  name: Joi.string().trim().min(1).required(),
  displayName: Joi.string().trim().min(1).required(),
  relation: Joi.string().trim().min(1).required(),
  // Optional so existing clients that don't send it keep working; the model
  // defaults to 'other'.
  kind: Joi.string().valid(...HOUSEHOLD_KINDS).optional()
})

const joinHouseholdSchema = Joi.object({
  inviteCode: Joi.string().trim().min(4).required(),
  role: Joi.string().valid('caregiver', 'elder', 'viewer').required(),
  displayName: Joi.string().trim().min(1).required(),
  relation: Joi.string().trim().min(1).required()
})

// Still the PATCH /:householdId body. `name` is no longer required on its own
// now that `kind` is also editable — one or the other must be present.
const renameHouseholdSchema = Joi.object({
  name: Joi.string().trim().min(1).optional(),
  kind: Joi.string().valid(...HOUSEHOLD_KINDS).optional()
}).or('name', 'kind')

const claimHouseholdSchema = Joi.object({
  claimCode: Joi.string().trim().min(4).required()
})

module.exports = {
  createHouseholdSchema,
  joinHouseholdSchema,
  renameHouseholdSchema,
  claimHouseholdSchema
}
