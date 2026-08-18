const Joi = require('joi')

const KINDS = ['ID', 'สิทธิ์', 'ประกัน', 'PDF']

const documentCreateSchema = Joi.object({
  memberId: Joi.string().optional().allow(null),
  name: Joi.string().trim().min(1).required(),
  kind: Joi.string().valid(...KINDS).required(),
  meta: Joi.string().optional().allow(''),
  referenceNumber: Joi.string().optional().allow('', null),
  issuedAt: Joi.date().optional().allow(null),
  expiresAt: Joi.date().optional().allow(null),
  fileUrl: Joi.string().optional().allow('', null)
})

const documentUpdateSchema = Joi.object({
  memberId: Joi.string().optional().allow(null),
  name: Joi.string().trim().min(1).optional(),
  kind: Joi.string().valid(...KINDS).optional(),
  meta: Joi.string().optional().allow(''),
  referenceNumber: Joi.string().optional().allow('', null),
  issuedAt: Joi.date().optional().allow(null),
  expiresAt: Joi.date().optional().allow(null),
  fileUrl: Joi.string().optional().allow('', null)
}).min(1)

module.exports = {
  documentCreateSchema,
  documentUpdateSchema
}
