const Joi = require('joi')

const createHouseholdSchema = Joi.object({
  name: Joi.string().trim().min(1).required(),
  displayName: Joi.string().trim().min(1).required(),
  relation: Joi.string().trim().min(1).required()
})

const joinHouseholdSchema = Joi.object({
  inviteCode: Joi.string().trim().min(4).required(),
  role: Joi.string().valid('caregiver', 'elder', 'viewer').required(),
  displayName: Joi.string().trim().min(1).required(),
  relation: Joi.string().trim().min(1).required()
})

const renameHouseholdSchema = Joi.object({
  name: Joi.string().trim().min(1).required()
})

const claimHouseholdSchema = Joi.object({
  claimCode: Joi.string().trim().min(4).required()
})

module.exports = {
  createHouseholdSchema,
  joinHouseholdSchema,
  renameHouseholdSchema,
  claimHouseholdSchema
}
