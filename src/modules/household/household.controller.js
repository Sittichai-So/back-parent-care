const { successResponse } = require('../../utils/response')
const householdService = require('./household.service')

const createHousehold = async (req, res, next) => {
  try {
    const data = await householdService.create(req.user.id, req.body)
    res.status(201).json(successResponse(data, 'Household created'))
  } catch (error) {
    next(error)
  }
}

const joinHousehold = async (req, res, next) => {
  try {
    const data = await householdService.join(req.user.id, req.body)
    res.status(201).json(successResponse(data, 'Joined household'))
  } catch (error) {
    next(error)
  }
}

const listMyHouseholds = async (req, res, next) => {
  try {
    const data = await householdService.listMine(req.user.id)
    res.json(successResponse(data))
  } catch (error) {
    next(error)
  }
}

const getHousehold = async (req, res, next) => {
  try {
    res.json(successResponse({ household: req.household, membership: req.membership }))
  } catch (error) {
    next(error)
  }
}

const renameHousehold = async (req, res, next) => {
  try {
    const data = await householdService.rename(req.household._id, req.body)
    res.json(successResponse(data, 'Household updated'))
  } catch (error) {
    next(error)
  }
}

// The design's "ตั้งเป็นค่าเริ่มต้น" toggle. Acts on the caller's own
// membership, so it needs no body — which household is in the URL, and who is
// in the token.
const setDefaultHousehold = async (req, res, next) => {
  try {
    const data = await householdService.setDefaultHousehold(req.user.id, req.household._id)
    res.json(successResponse(data, 'Default household updated'))
  } catch (error) {
    next(error)
  }
}

const rotateInviteCode = async (req, res, next) => {
  try {
    const data = await householdService.rotateInviteCode(req.household._id)
    res.json(successResponse(data, 'Invite code rotated'))
  } catch (error) {
    next(error)
  }
}

module.exports = {
  createHousehold,
  joinHousehold,
  listMyHouseholds,
  getHousehold,
  renameHousehold,
  setDefaultHousehold,
  rotateInviteCode
}
