const Joi = require('joi')

const registerSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required().messages({
    'string.min': 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร',
    'any.required': 'กรุณากรอกรหัสผ่าน'
  }),
  phone: Joi.string()
    .pattern(/^0\d{8,9}$/)
    .required()
    .messages({
      'string.pattern.base': 'เบอร์โทรศัพท์ไม่ถูกต้อง (ต้องขึ้นต้นด้วย 0 และมี 9-10 หลัก)',
      'string.empty': 'กรุณากรอกเบอร์โทรศัพท์',
      'any.required': 'กรุณากรอกเบอร์โทรศัพท์'
    }),
  address: Joi.string().allow('', null),
  profileImage: Joi.string().uri().allow('', null)
})

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
})

module.exports = {
  registerSchema,
  loginSchema
}
