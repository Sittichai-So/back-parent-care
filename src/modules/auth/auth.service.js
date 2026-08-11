const bcrypt = require('bcryptjs')
const repository = require('./auth.repository')
const { signToken } = require('../../utils/jwt')
const { generateUserCode } = require('../../utils/invite-code')

const generateUniqueUserCode = async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateUserCode()
    // eslint-disable-next-line no-await-in-loop
    const existing = await repository.findByUserCode(code)
    if (!existing) return code
  }
  const error = new Error('Could not generate a unique user code, please try again')
  error.statusCode = 500
  throw error
}

const register = async (data) => {
  const existingUser = await repository.findByEmail(data.email)
  if (existingUser) {
    const error = new Error('Email is already registered')
    error.statusCode = 400
    throw error
  }

  const hashedPassword = await bcrypt.hash(data.password, 10)
  const userCode = await generateUniqueUserCode()
  const user = await repository.createUser({
    ...data,
    password: hashedPassword,
    userCode
  })

  const token = signToken({ id: user._id, email: user.email })

  return {
    user,
    token
  }
}

const login = async ({ email, password }) => {
  const user = await repository.findByEmailWithPassword(email)
  if (!user) {
    const error = new Error('Invalid credentials')
    error.statusCode = 401
    throw error
  }

  const validPassword = await bcrypt.compare(password, user.password)
  if (!validPassword) {
    const error = new Error('Invalid credentials')
    error.statusCode = 401
    throw error
  }

  const token = signToken({ id: user._id, email: user.email })

  return {
    user,
    token
  }
}

module.exports = {
  register,
  login
}
