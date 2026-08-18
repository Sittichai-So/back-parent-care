const { successResponse } = require('../../utils/response')
const service = require('./expense.service')

const getExpenses = async (req, res, next) => {
  try {
    const data = await service.getAll(req.household._id, {
      memberId: req.query.memberId,
      category: req.query.category,
      month: req.query.month
    })
    res.json(successResponse(data))
  } catch (error) {
    next(error)
  }
}

const getExpenseSummary = async (req, res, next) => {
  try {
    const data = await service.getMonthlySummary(req.household._id, { month: req.query.month })
    res.json(successResponse(data))
  } catch (error) {
    next(error)
  }
}

const createExpense = async (req, res, next) => {
  try {
    const data = await service.createOne(req.household._id, req.membership, req.body)
    res.status(201).json(successResponse(data, 'Created successfully'))
  } catch (error) {
    next(error)
  }
}

const updateExpense = async (req, res, next) => {
  try {
    const data = await service.updateOne(req.params.expenseId, req.household._id, req.body)
    res.json(successResponse(data, 'Updated successfully'))
  } catch (error) {
    next(error)
  }
}

const deleteExpense = async (req, res, next) => {
  try {
    await service.deleteOne(req.params.expenseId, req.household._id)
    res.json(successResponse(null, 'Deleted successfully'))
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getExpenses,
  getExpenseSummary,
  createExpense,
  updateExpense,
  deleteExpense
}
