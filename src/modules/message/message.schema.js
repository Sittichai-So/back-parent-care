const Joi = require('joi')

// The design's composer is a single-line pill with no attachments, so text
// is all a message carries. 2000 chars is a sanity ceiling, not a product
// rule — the UI never approaches it.
const messageCreateSchema = Joi.object({
  text: Joi.string().trim().min(1).max(2000).required()
})

module.exports = {
  messageCreateSchema
}
