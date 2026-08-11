const Joi = require('joi')

const updateMemberSchema = Joi.object({
  role: Joi.string().valid('owner', 'caregiver', 'elder', 'viewer').optional(),
  displayName: Joi.string().trim().min(1).optional(),
  relation: Joi.string().trim().min(1).optional(),
  status: Joi.string().valid('normal', 'monitor', 'urgent').optional(),
  detail: Joi.string().allow('').optional(),
  birthday: Joi.date().optional().allow(null),
  gender: Joi.string().optional().allow(null, ''),
  avatar: Joi.string().uri().optional().allow('', null)
}).min(1)

// Creates a member profile with no linked account of its own (e.g. an
// elderly relative with no phone). owner/caregiver are deliberately excluded
// — those roles require someone who can log in and act for themself.
const createManagedMemberSchema = Joi.object({
  displayName: Joi.string().trim().min(1).required(),
  relation: Joi.string().trim().min(1).required(),
  role: Joi.string().valid('elder', 'viewer').required(),
  birthday: Joi.date().optional().allow(null),
  gender: Joi.string().optional().allow(null, ''),
  avatar: Joi.string().uri().optional().allow('', null)
})

// Sends a pending invite to an existing account (found via /users/lookup).
// owner is excluded — there is exactly one owner, set at household creation.
const inviteExistingUserSchema = Joi.object({
  userId: Joi.string().hex().length(24).required(),
  role: Joi.string().valid('caregiver', 'elder', 'viewer').required(),
  displayName: Joi.string().trim().min(1).required(),
  relation: Joi.string().trim().min(1).required()
})

module.exports = {
  updateMemberSchema,
  createManagedMemberSchema,
  inviteExistingUserSchema
}
