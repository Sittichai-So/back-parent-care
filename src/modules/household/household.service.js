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
  throw createError('ไม่สามารถสร้างรหัสเชิญได้ กรุณาลองใหม่อีกครั้ง', 500)
}

/**
 * Points this user's "กลุ่มเริ่มต้น" at one household and clears the flag on
 * every other membership they hold, so the invariant "at most one default per
 * user" holds without a partial unique index.
 */
// updateMany on both sides rather than a findOne+save: {householdId, userId}
// is already unique for account-backed memberships, so the "set" half touches
// exactly one row.
const setDefaultHousehold = async (userId, householdId) => {
  await householdMemberRepository.updateMany({ userId, householdId: { $ne: householdId } }, { isDefault: false })
  await householdMemberRepository.updateMany({ userId, householdId }, { isDefault: true })
  return householdMemberRepository.findOne({ userId, householdId })
}

const create = async (userId, { name, displayName, relation, kind }) => {
  const inviteCode = await generateUniqueInviteCode()
  const household = await householdRepository.create({
    name,
    ownerUserId: userId,
    inviteCode,
    ...(kind ? { kind } : {})
  })

  // "the first group added becomes default automatically" — the household
  // being created right now is the user's only one when they had none before.
  const existingCount = await householdMemberRepository.countDocuments({ userId, isActive: true })

  const membership = await householdMemberRepository.create({
    householdId: household._id,
    userId,
    role: 'owner',
    displayName,
    relation,
    isDefault: existingCount === 0
  })

  return { household, membership }
}

const join = async (userId, { inviteCode, role, displayName, relation }) => {
  const household = await householdRepository.findByInviteCode(inviteCode.trim().toUpperCase())
  if (!household) {
    throw createError('รหัสเชิญไม่ถูกต้อง', 404)
  }

  const existing = await householdMemberRepository.findOne({ householdId: household._id, userId })
  if (existing) {
    throw createError('คุณเป็นสมาชิกของกลุ่มบ้านนี้อยู่แล้ว', 400)
  }

  // Same "first household becomes default automatically" rule as create() —
  // without this, an account whose very first household came from joining
  // (rather than creating one) ends up with no default household at all.
  const existingCount = await householdMemberRepository.countDocuments({ userId, isActive: true })

  const membership = await householdMemberRepository.create({
    householdId: household._id,
    userId,
    role,
    displayName,
    relation,
    isDefault: existingCount === 0
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

// Handles both the name and the group `kind` — the design's group sheet lets
// either be corrected after creation. Only the keys actually supplied are
// written, so a name-only PATCH never resets kind and vice versa.
const rename = async (id, { name, kind }) => {
  const patch = {}
  if (name !== undefined) patch.name = name
  if (kind !== undefined) patch.kind = kind
  return householdRepository.updateById(id, patch)
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
  rotateInviteCode,
  setDefaultHousehold
}
