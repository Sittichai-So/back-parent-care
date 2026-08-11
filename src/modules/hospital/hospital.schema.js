const Joi = require('joi')

const hospitalSchema = Joi.object({
  name: Joi.string().required(),
  address: Joi.string().required(),
  province: Joi.string().required(),
  district: Joi.string().required(),
  phone: Joi.string().optional().allow('', null),
  latitude: Joi.number().optional().allow(null),
  longitude: Joi.number().optional().allow(null)
})

module.exports = {
  hospitalSchema
}
