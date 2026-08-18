const Joi = require('joi')

const CATEGORIES = ['medicine', 'treatment', 'transport', 'other']

const expenseCreateSchema = Joi.object({
  memberId: Joi.string().optional().allow(null),
  title: Joi.string().trim().min(1).required(),
  category: Joi.string().valid(...CATEGORIES).optional(),
  amount: Joi.number().min(0).required(),
  spentAt: Joi.date().optional(),
  note: Joi.string().optional().allow('', null)
})

const expenseUpdateSchema = Joi.object({
  memberId: Joi.string().optional().allow(null),
  title: Joi.string().trim().min(1).optional(),
  category: Joi.string().valid(...CATEGORIES).optional(),
  amount: Joi.number().min(0).optional(),
  spentAt: Joi.date().optional(),
  note: Joi.string().optional().allow('', null)
}).min(1)

module.exports = {
  expenseCreateSchema,
  expenseUpdateSchema
}
