const householdRepository = require('./household.repository')
const householdMemberRepository = require('./household-member.repository')
const { generateInviteCode } = require('../../utils/invite-code')

const createError = (message, statusCode) => {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

const generateUniqueInviteCode = async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateInviteCode()
    // eslint-disable-next-line no-await-in-loop
    const existing = await householdRepository.findByInviteCode(code)
    if (!existing) return code
  }
  throw createError('Could not generate a unique invite code, please try again', 500)
}

const create = async (userId, { name, displayName, relation }) => {
  const inviteCode = await generateUniqueInviteCode()
  const household = await householdRepository.create({ name, ownerUserId: userId, inviteCode })

  const membership = await householdMemberRepository.create({
    householdId: household._id,
    userId,
    role: 'owner',
    displayName,
    relation
  })

  return { household, membership }
}

const join = async (userId, { inviteCode, role, displayName, relation }) => {
  const household = await householdRepository.findByInviteCode(inviteCode.trim().toUpperCase())
  if (!household) {
    throw createError('Invalid invite code', 404)
  }

  const existing = await householdMemberRepository.findOne({ householdId: household._id, userId })
  if (existing) {
    throw createError('You are already a member of this household', 400)
  }

  const membership = await householdMemberRepository.create({
    householdId: household._id,
    userId,
    role,
    displayName,
    relation
  })

  return { household, membership }
}

const listMine = async (userId) => {
  const memberships = await householdMemberRepository.findAll({ userId, isActive: true })
  return Promise.all(
    memberships.map(async (membership) => ({
      household: await householdRepository.findById(membership.householdId),
      membership
    }))
  )
}

const getById = async (id) => {
  return householdRepository.findById(id)
}

const rename = async (id, name) => {
  return householdRepository.updateById(id, { name })
}

const rotateInviteCode = async (id) => {
  const inviteCode = await generateUniqueInviteCode()
  return householdRepository.updateById(id, { inviteCode, inviteCodeRotatedAt: new Date() })
}

module.exports = {
  create,
  join,
  listMine,
  getById,
  rename,
  rotateInviteCode
}
