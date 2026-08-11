const TimelineEvent = require('./timeline.model')

const create = (data) => TimelineEvent.create(data)

const findRecent = (householdId, { limit = 50, before } = {}) => {
  const filter = { householdId }
  if (before) {
    filter.occurredAt = { $lt: new Date(before) }
  }
  return TimelineEvent.find(filter)
    .sort({ occurredAt: -1 })
    .limit(limit)
    .populate('actorMemberId', 'displayName')
    .populate('relatedMemberId', 'displayName')
}

module.exports = {
  create,
  findRecent
}
