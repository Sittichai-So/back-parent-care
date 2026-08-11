const Joi = require('joi')

// "YYYY-MM-DD" / "HH:mm" — validated as plain strings, deliberately never
// Joi.date(), to keep the timezone-free string representation intact end
// to end (see the comment in appointment.model.js).
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

const appointmentSchema = Joi.object({
  memberId: Joi.string().required(),
  title: Joi.string().required(),
  date: Joi.string().pattern(DATE_PATTERN).required(),
  time: Joi.string().pattern(TIME_PATTERN).required(),
  hospital: Joi.string().required(),
  doctor: Joi.string().optional().allow('', null),
  department: Joi.string().optional().allow('', null),
  notes: Joi.string().optional().allow('', null),
  medicationNote: Joi.string().optional().allow('', null),
  linkedMedicationIds: Joi.array().items(Joi.string()).optional(),
  reminderEnabled: Joi.boolean().optional(),
  status: Joi.string().optional()
})

module.exports = {
  appointmentSchema
}
