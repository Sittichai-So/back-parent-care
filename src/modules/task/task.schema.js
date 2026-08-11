const Joi = require('joi')

const RELATED_TYPES = ['checkin', 'medication', 'appointment', 'vitals', 'custom']

const taskCreateSchema = Joi.object({
  title: Joi.string().required(),
  detail: Joi.string().optional().allow(''),
  assignedToMemberId: Joi.string().optional().allow(null),
  relatedType: Joi.string().valid(...RELATED_TYPES).optional(),
  dueAt: Joi.date().optional().allow(null)
})

const taskUpdateSchema = Joi.object({
  title: Joi.string().optional(),
  detail: Joi.string().optional().allow(''),
  assignedToMemberId: Joi.string().optional().allow(null),
  relatedType: Joi.string().valid(...RELATED_TYPES).optional(),
  dueAt: Joi.date().optional().allow(null)
}).min(1)

const taskStatusSchema = Joi.object({
  status: Joi.string().valid('pending', 'in-progress', 'done').required()
})

module.exports = {
  taskCreateSchema,
  taskUpdateSchema,
  taskStatusSchema
}
