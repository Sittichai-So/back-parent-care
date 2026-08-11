const Joi = require('joi')

const triggerEmergencySchema = Joi.object({
  // Omitted → defaults to the caller themself (see household-scope.js).
  forMemberId: Joi.string().optional(),
  message: Joi.string().optional().allow('', null),
  location: Joi.object({
    latitude: Joi.number().required(),
    longitude: Joi.number().required()
  })
    .optional()
    .allow(null)
})

module.exports = {
  triggerEmergencySchema
}
