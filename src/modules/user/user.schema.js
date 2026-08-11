const Joi = require('joi')

const updateProfileSchema = Joi.object({
  fullName: Joi.string().optional(),
  phone: Joi.string().allow('', null),
  profileImage: Joi.string().uri().allow('', null),
  settings: Joi.object().optional()
})

// Exactly one of code/email, and always an exact match downstream — never a
// regex/partial search, so this endpoint can't be used to enumerate other
// users' accounts.
const lookupUserSchema = Joi.object({
  code: Joi.string().trim().min(4).max(20),
  email: Joi.string().trim().lowercase().email()
}).xor('code', 'email')

module.exports = {
  updateProfileSchema,
  lookupUserSchema
}
