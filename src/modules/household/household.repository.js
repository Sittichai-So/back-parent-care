const Household = require('./household.model')

const findById = (id) => Household.findById(id)

const findByInviteCode = (inviteCode) => Household.findOne({ inviteCode })

const create = (data) => Household.create(data)

const updateById = (id, data) => Household.findByIdAndUpdate(id, data, { new: true, runValidators: true })

module.exports = {
  findById,
  findByInviteCode,
  create,
  updateById
}
