const mongoose = require('mongoose')
const repository = require('./expense.repository')

const createError = (message, statusCode) => {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

// The Thai labels the dashboard's stacked-bar legend prints, keyed by the
// slug stored on the row. Kept server-side so every client renders the same
// wording as the design (screen 11) without its own lookup table.
const CATEGORY_LABELS = {
  medicine: 'ค่ายา',
  treatment: 'ค่าตรวจอายุรกรรม',
  transport: 'ค่าเดินทางโรงพยาบาล',
  other: 'อื่น ๆ'
}

const findOwned = async (id, householdId) => {
  const expense = await repository.findById(id)
  if (!expense || String(expense.householdId) !== String(householdId)) {
    throw createError('Expense not found', 404)
  }
  return expense
}

// "YYYY-MM" → the half-open range [first of that month, first of the next).
// Defaults to the current month, which is what the dashboard card shows.
const monthRange = (month) => {
  const now = new Date()
  let year = now.getFullYear()
  let monthIndex = now.getMonth()

  if (month) {
    const match = /^(\d{4})-(\d{2})$/.exec(String(month))
    if (!match) {
      throw createError('month must be in YYYY-MM format', 400)
    }
    year = Number(match[1])
    monthIndex = Number(match[2]) - 1
    if (monthIndex < 0 || monthIndex > 11) {
      throw createError('month must be in YYYY-MM format', 400)
    }
  }

  return {
    from: new Date(year, monthIndex, 1),
    to: new Date(year, monthIndex + 1, 1),
    key: `${year}-${String(monthIndex + 1).padStart(2, '0')}`
  }
}

const getAll = async (householdId, { memberId, category, month } = {}) => {
  const filter = { householdId }
  if (memberId) filter.memberId = memberId
  if (category) filter.category = category
  if (month) {
    const { from, to } = monthRange(month)
    filter.spentAt = { $gte: from, $lt: to }
  }
  return repository.findAll(filter)
}

/**
 * Feeds the dashboard's "ค่าใช้จ่ายเดือนนี้" card: a total, an item count and
 * one entry per category carrying both the baht figure and its share of the
 * total. `pct` is rounded so the client can use it directly as a bar width;
 * the largest slice absorbs the rounding drift so the parts always add to
 * exactly 100 and the stacked bar never leaves a sliver of background.
 */
const getMonthlySummary = async (householdId, { month } = {}) => {
  const { from, to, key } = monthRange(month)

  const grouped = await repository.aggregateByCategory(new mongoose.Types.ObjectId(String(householdId)), { from, to })

  const total = grouped.reduce((sum, row) => sum + row.amount, 0)
  const count = grouped.reduce((sum, row) => sum + row.count, 0)

  const categories = grouped.map((row) => ({
    category: row._id,
    label: CATEGORY_LABELS[row._id] || CATEGORY_LABELS.other,
    amount: row.amount,
    count: row.count,
    pct: total > 0 ? Math.round((row.amount / total) * 100) : 0
  }))

  if (categories.length > 0 && total > 0) {
    const drift = 100 - categories.reduce((sum, row) => sum + row.pct, 0)
    categories[0].pct += drift
  }

  return { month: key, total, count, categories }
}

const createOne = async (householdId, membership, data) => {
  return repository.create({ ...data, householdId, createdByMemberId: membership._id })
}

const updateOne = async (id, householdId, data) => {
  await findOwned(id, householdId)
  return repository.updateById(id, data)
}

const deleteOne = async (id, householdId) => {
  await findOwned(id, householdId)
  return repository.deleteById(id)
}

module.exports = {
  getAll,
  getMonthlySummary,
  createOne,
  updateOne,
  deleteOne,
  CATEGORY_LABELS
}
