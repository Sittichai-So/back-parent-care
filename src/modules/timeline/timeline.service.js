const repository = require('./timeline.repository')

/**
 * Records one append-only activity entry. Other modules' services call this
 * directly as a plain function after their own write succeeds — there's no
 * queue at this scale, so it's a same-process best-effort call. Callers
 * should not let a timeline failure block the primary action; wrap in
 * try/catch at the call site if that matters for a given flow.
 */
const recordEvent = async ({ householdId, actorMemberId = null, relatedMemberId = null, type, title, detail = '', relatedId = null }) => {
  return repository.create({ householdId, actorMemberId, relatedMemberId, type, title, detail, relatedId })
}

const listRecent = async (householdId, options = {}) => {
  return repository.findRecent(householdId, options)
}

module.exports = {
  recordEvent,
  listRecent
}
