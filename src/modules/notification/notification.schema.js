const Joi = require('joi')

const notificationIdSchema = Joi.object({
  id: Joi.string().required()
})

module.exports = {
  notificationIdSchema
}
