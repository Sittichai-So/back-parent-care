const repository = require('./user.repository')
const authRepository = require('../auth/auth.repository')
const memberService = require('../household/household-member.service')

const createError = (message, statusCode) => {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

const getProfile = async (userId) => {
  return repository.findByUserId(userId)
}

const updateProfile = async (userId, data) => {
  return repository.createOrUpdate(userId, data)
}

// Exact match only (by userCode or email) — deliberately not a name search,
// so this can't be used to enumerate other users' accounts. Returns only
// what's needed to send an invite, never the account's email/phone/etc.
const lookupUser = async ({ code, email }) => {
  const user = code
    ? await authRepository.findByUserCode(code.trim().toUpperCase())
    : await authRepository.findByEmail(email.trim().toLowerCase())

  if (!user || !user.isActive) {
    throw createError('ไม่พบผู้ใช้นี้', 404)
  }

  return { _id: user._id, name: user.name, userCode: user.userCode }
}

const listPendingInvites = async (userId) => {
  return memberService.listPendingInvitesForUser(userId)
}

module.exports = {
  getProfile,
  updateProfile,
  lookupUser,
  listPendingInvites
}
