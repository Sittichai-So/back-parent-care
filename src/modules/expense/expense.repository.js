const Expense = require('./expense.model')

const MEMBER_FIELDS = 'displayName relation'

const findAll = async (filter = {}) => {
  return Expense.find(filter).sort({ spentAt: -1 }).populate('memberId', MEMBER_FIELDS)
}

const findById = async (id) => {
  return Expense.findById(id).populate('memberId', MEMBER_FIELDS)
}

const create = async (data) => {
  const expense = await Expense.create(data)
  return expense.populate('memberId', MEMBER_FIELDS)
}

const updateById = async (id, data) => {
  return Expense.findByIdAndUpdate(id, data, { new: true, runValidators: true }).populate('memberId', MEMBER_FIELDS)
}

const deleteById = async (id) => {
  return Expense.findByIdAndDelete(id)
}

// Totals per category over a date window, computed in Mongo rather than by
// pulling every row into Node — the dashboard only ever needs the sums.
const aggregateByCategory = async (householdId, { from, to }) => {
  return Expense.aggregate([
    { $match: { householdId, spentAt: { $gte: from, $lt: to } } },
    { $group: { _id: '$category', amount: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { amount: -1 } }
  ])
}

module.exports = {
  findAll,
  findById,
  create,
  updateById,
  deleteById,
  aggregateByCategory
}
