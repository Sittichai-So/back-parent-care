const User = require('./auth.model')

const findByEmail = async (email) => {
  return User.findOne({ email })
}

// Only the login flow needs the password hash, to compare it — the field is
// select: false by default, so every other lookup gets it stripped for free.
const findByEmailWithPassword = async (email) => {
  return User.findOne({ email }).select('+password')
}

const findById = async (id) => {
  return User.findById(id)
}

const findByUserCode = async (userCode) => {
  return User.findOne({ userCode })
}

const createUser = async (data) => {
  return User.create(data)
}

module.exports = {
  findByEmail,
  findByEmailWithPassword,
  findById,
  findByUserCode,
  createUser
}
