const repository = require('./medication-log.repository')

// Household-wide log listing (e.g. "everything taken/missed this week").
// Log *creation* lives in medicine.service.js#logDose since it's always
// scoped to one medicine and needs that medicine's household-role checks.
const getAll = async (householdId, { memberId, status } = {}) => {
  const filter = { householdId }
  if (memberId) filter.memberId = memberId
  if (status) filter.status = status
  return repository.findAll(filter)
}

module.exports = {
  getAll
}
