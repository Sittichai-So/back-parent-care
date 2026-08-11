const { errorResponse } = require('../../../utils/response')
const Household = require('../../../modules/household/household.model')
const HouseholdMember = require('../../../modules/household/household-member.model')

// Loads the household + the caller's membership from a :householdId route
// param, so nested routes (medicines, appointments, vitals, ...) can trust
// req.household/req.membership without re-fetching. Must run after
// authMiddleware (needs req.user.id).
const householdMiddleware = async (req, res, next) => {
  try {
    const { householdId } = req.params

    const household = await Household.findById(householdId)
    if (!household) {
      return res.status(404).json(errorResponse('Household not found'))
    }

    const membership = await HouseholdMember.findOne({
      householdId: household._id,
      userId: req.user.id,
      isActive: true,
      // Excludes memberships still awaiting the invitee's accept — matched
      // with $ne rather than 'active' so members created before the
      // membershipState field existed (no field at all, not even the
      // default) still pass until the backfill migration runs.
      membershipState: { $ne: 'pending' }
    })
    if (!membership) {
      return res.status(403).json(errorResponse('You are not a member of this household'))
    }

    req.household = household
    req.membership = membership
    next()
  } catch (error) {
    next(error)
  }
}

module.exports = householdMiddleware
