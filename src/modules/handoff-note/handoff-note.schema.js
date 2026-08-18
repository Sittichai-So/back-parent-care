const Joi = require('joi')

// The design's composer is a 3-row textarea with no other inputs, so text is
// all a note carries.
const handoffNoteCreateSchema = Joi.object({
  text: Joi.string().trim().min(1).max(2000).required()
})

module.exports = {
  handoffNoteCreateSchema
}
