const repository = require('./household-member.repository')
const householdRepository = require('./household.repository')
const authRepository = require('../auth/auth.repository')
const timelineService = require('../timeline/timeline.service')
const { generateClaimCode } = require('../../utils/invite-code')

const CLAIM_CODE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

const createError = (message, statusCode) => {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

const listByHousehold = async (householdId) => {
  // Includes pending invites alongside active members — callers (frontend)
  // must branch on membershipState themselves.
  return repository.findAll({ householdId, isActive: true })
}

const getById = async (id) => {
  return repository.findById(id)
}

const update = async (id, data, requesterMembership) => {
  const target = await repository.findById(id)
  if (!target) {
    throw createError('Member not found', 404)
  }

  if (data.role && requesterMembership.role !== 'owner') {
    throw createError('Only the owner can change member roles', 403)
  }

  // A member profile with no linked account can never hold owner/caregiver —
  // those roles require someone who can log in and act for themself.
  if (data.role && !target.userId && ['owner', 'caregiver'].includes(data.role)) {
    throw createError('A member without a linked account cannot be owner or caregiver', 400)
  }

  const isSelf = String(requesterMembership._id) === String(id)
  const isPrivileged = requesterMembership.role === 'owner' || requesterMembership.role === 'caregiver'
  if (!isSelf && !isPrivileged) {
    throw createError('You do not have permission to update this member', 403)
  }

  return repository.updateById(id, data)
}

const remove = async (id, requesterMembership) => {
  if (requesterMembership.role !== 'owner') {
    throw createError('Only the owner can remove members', 403)
  }

  const target = await repository.findById(id)
  if (!target) {
    throw createError('Member not found', 404)
  }
  if (target.role === 'owner') {
    throw createError('The household owner cannot be removed', 400)
  }

  return repository.updateById(id, { isActive: false })
}

const checkIn = async (id, requesterMembership) => {
  if (String(requesterMembership._id) !== String(id)) {
    throw createError('You can only check in for yourself', 403)
  }

  const now = new Date()
  const time = now.toTimeString().slice(0, 5)
  const updated = await repository.updateById(id, { status: 'normal', detail: `Check-in ${time}` })

  await timelineService.recordEvent({
    householdId: updated.householdId,
    actorMemberId: updated._id,
    relatedMemberId: updated._id,
    type: 'check-in',
    title: 'Check-in completed',
    detail: `${updated.displayName} ยืนยันว่าปกติดี`
  })

  return updated
}

// --- Path 1: member profile with no linked account of its own -------------

const createManagedMember = async (householdId, data, requesterMembership) => {
  return repository.create({
    householdId,
    userId: null,
    role: data.role,
    displayName: data.displayName,
    relation: data.relation,
    birthday: data.birthday || null,
    gender: data.gender || null,
    avatar: data.avatar || null,
    createdByMemberId: requesterMembership._id,
    membershipState: 'active'
  })
}

// --- Path 2: invite an existing account, gated on their acceptance --------

const inviteExistingUser = async (householdId, data, requesterMembership) => {
  const targetUser = await authRepository.findById(data.userId)
  if (!targetUser || !targetUser.isActive) {
    throw createError('User not found', 404)
  }

  const existing = await repository.findOne({ householdId, userId: data.userId })
  if (existing) {
    if (existing.membershipState === 'pending') {
      throw createError('An invite is already pending for this user', 400)
    }
    throw createError('This user is already a member of this household', 400)
  }

  return repository.create({
    householdId,
    userId: data.userId,
    role: data.role,
    displayName: data.displayName,
    relation: data.relation,
    createdByMemberId: requesterMembership._id,
    membershipState: 'pending'
  })
}

const listPendingInvitesForUser = async (userId) => {
  const pending = await repository.findAll({ userId, membershipState: 'pending' })
  return Promise.all(
    pending.map(async (membership) => ({
      household: await householdRepository.findById(membership.householdId),
      membership
    }))
  )
}

// Only the invited account itself may accept/decline — not the household
// owner/caregiver who sent the invite, even though they can do almost
// everything else for other members.
const assertRespondingToOwnInvite = (target, householdId, requesterUserId) => {
  if (!target || String(target.householdId) !== String(householdId)) {
    throw createError('Invite not found', 404)
  }
  if (!target.userId || String(target.userId) !== String(requesterUserId)) {
    throw createError('You do not have permission to respond to this invite', 403)
  }
  if (target.membershipState !== 'pending') {
    throw createError('This invite is no longer pending', 400)
  }
}

const acceptInvite = async (householdId, memberId, requesterUserId) => {
  const target = await repository.findById(memberId)
  assertRespondingToOwnInvite(target, householdId, requesterUserId)

  const updated = await repository.updateById(memberId, { membershipState: 'active' })

  await timelineService.recordEvent({
    householdId: updated.householdId,
    actorMemberId: updated._id,
    relatedMemberId: updated._id,
    type: 'member-joined',
    title: 'Member joined',
    detail: `${updated.displayName} เข้าร่วมกลุ่มแล้ว`
  })

  return updated
}

const declineInvite = async (householdId, memberId, requesterUserId) => {
  const target = await repository.findById(memberId)
  assertRespondingToOwnInvite(target, householdId, requesterUserId)

  await repository.deleteById(memberId)
  return null
}

// --- Claim: attach a real account to an existing userId-less profile ------

const generateClaimCodeForMember = async (memberId, requesterMembership) => {
  const target = await repository.findById(memberId)
  if (!target) {
    throw createError('Member not found', 404)
  }
  if (target.userId) {
    throw createError('This member already has a linked account', 400)
  }

  const claimCode = generateClaimCode()
  const claimCodeExpiresAt = new Date(Date.now() + CLAIM_CODE_TTL_MS)
  return repository.updateById(memberId, { claimCode, claimCodeExpiresAt })
}

const claimMember = async (requesterUserId, claimCode) => {
  const target = await repository.findByClaimCode(claimCode.trim().toUpperCase())
  if (!target) {
    throw createError('Invalid claim code', 404)
  }
  // Defensive: claimCode is cleared the moment a member is claimed, so this
  // should be unreachable, but never let a second claim overwrite the link.
  if (target.userId) {
    throw createError('This member already has a linked account', 400)
  }
  if (!target.claimCodeExpiresAt || target.claimCodeExpiresAt < new Date()) {
    throw createError('This claim code has expired', 400)
  }

  const existingMembership = await repository.findOne({ householdId: target.householdId, userId: requesterUserId })
  if (existingMembership) {
    throw createError('You are already a member of this household', 400)
  }

  return repository.updateById(target._id, {
    userId: requesterUserId,
    claimCode: null,
    claimCodeExpiresAt: null
  })
}

module.exports = {
  listByHousehold,
  getById,
  update,
  remove,
  checkIn,
  createManagedMember,
  inviteExistingUser,
  listPendingInvitesForUser,
  acceptInvite,
  declineInvite,
  generateClaimCodeForMember,
  claimMember
}
