const { errorResponse } = require('../../../utils/response')

const ROLE_LABELS = {
  owner: 'เจ้าของบ้าน',
  caregiver: 'ผู้ดูแล',
  elder: 'ผู้สูงอายุ',
  viewer: 'ผู้ใช้สิทธิ์ดูอย่างเดียว'
}

// Must run after householdMiddleware (needs req.membership).
const requireHouseholdRole = (...roles) => {
  return (req, res, next) => {
    if (!req.membership || !roles.includes(req.membership.role)) {
      const allowed = roles.map((role) => ROLE_LABELS[role] || role).join(' หรือ ')
      return res.status(403).json(errorResponse(`เฉพาะ${allowed}เท่านั้นที่ทำรายการนี้ได้`))
    }
    next()
  }
}

module.exports = requireHouseholdRole
