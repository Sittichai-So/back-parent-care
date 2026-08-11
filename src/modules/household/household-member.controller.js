const { successResponse } = require('../../utils/response')
const memberService = require('./household-member.service')

const getMembers = async (req, res, next) => {
  try {
    const data = await memberService.listByHousehold(req.household._id)
    res.json(successResponse(data))
  } catch (error) {
    next(error)
  }
}

const getMember = async (req, res, next) => {
  try {
    const data = await memberService.getById(req.params.memberId)
    res.json(successResponse(data))
  } catch (error) {
    next(error)
  }
}

const updateMember = async (req, res, next) => {
  try {
    const data = await memberService.update(req.params.memberId, req.body, req.membership)
    res.json(successResponse(data, 'Member updated'))
  } catch (error) {
    next(error)
  }
}

const removeMember = async (req, res, next) => {
  try {
    await memberService.remove(req.params.memberId, req.membership)
    res.json(successResponse(null, 'Member removed'))
  } catch (error) {
    next(error)
  }
}

const checkIn = async (req, res, next) => {
  try {
    const data = await memberService.checkIn(req.params.memberId, req.membership)
    res.json(successResponse(data, 'Checked in'))
  } catch (error) {
    next(error)
  }
}

const createManagedMember = async (req, res, next) => {
  try {
    const data = await memberService.createManagedMember(req.household._id, req.body, req.membership)
    res.status(201).json(successResponse(data, 'Member added'))
  } catch (error) {
    next(error)
  }
}

const inviteExistingUser = async (req, res, next) => {
  try {
    const data = await memberService.inviteExistingUser(req.household._id, req.body, req.membership)
    res.status(201).json(successResponse(data, 'Invite sent'))
  } catch (error) {
    next(error)
  }
}

const generateClaimCode = async (req, res, next) => {
  try {
    const data = await memberService.generateClaimCodeForMember(req.params.memberId, req.membership)
    res.json(successResponse(data, 'Claim code generated'))
  } catch (error) {
    next(error)
  }
}

// acceptInvite/declineInvite/claimMember are mounted directly on
// household.routes.js (not household-member.routes.js) so they run without
// householdMiddleware — the invitee isn't an active member of the household
// yet, so that middleware would 403 them before they ever reach here. See
// household.routes.js for why.

const acceptInvite = async (req, res, next) => {
  try {
    const data = await memberService.acceptInvite(req.params.householdId, req.params.memberId, req.user.id)
    res.json(successResponse(data, 'Joined household'))
  } catch (error) {
    next(error)
  }
}

const declineInvite = async (req, res, next) => {
  try {
    await memberService.declineInvite(req.params.householdId, req.params.memberId, req.user.id)
    res.json(successResponse(null, 'Invite declined'))
  } catch (error) {
    next(error)
  }
}

const claimMember = async (req, res, next) => {
  try {
    const data = await memberService.claimMember(req.user.id, req.body.claimCode)
    res.json(successResponse(data, 'Account linked'))
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getMembers,
  getMember,
  updateMember,
  removeMember,
  checkIn,
  createManagedMember,
  inviteExistingUser,
  generateClaimCode,
  acceptInvite,
  declineInvite,
  claimMember
}
