const Joi = require('joi')

const medicineSchema = Joi.object({
  memberId: Joi.string().required(),
  name: Joi.string().required(),
  dosage: Joi.string().required(),
  reason: Joi.string().optional().allow('', null),
  frequency: Joi.string().optional().allow('', null),
  times: Joi.array().items(Joi.string()).optional(),
  notes: Joi.string().optional().allow('', null),
  startDate: Joi.date().optional().allow(null),
  endDate: Joi.date().optional().allow(null),
  image: Joi.string().uri().optional().allow('', null),
  isActive: Joi.boolean().optional()
})

module.exports = {
  medicineSchema
}
