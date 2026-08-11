const { errorResponse } = require('../../../utils/response')

// Must run after householdMiddleware (needs req.membership).
const requireHouseholdRole = (...roles) => {
  return (req, res, next) => {
    if (!req.membership || !roles.includes(req.membership.role)) {
      return res.status(403).json(errorResponse('Insufficient permissions for this household role'))
    }
    next()
  }
}

module.exports = requireHouseholdRole
