const HouseholdMember = require('./household-member.model')

const findAll = (filter = {}) => HouseholdMember.find(filter).sort({ createdAt: 1 })

const findById = (id) => HouseholdMember.findById(id)

const findOne = (filter) => HouseholdMember.findOne(filter)

const findByClaimCode = (claimCode) => HouseholdMember.findOne({ claimCode })

const create = (data) => HouseholdMember.create(data)

const updateById = (id, data) => HouseholdMember.findByIdAndUpdate(id, data, { new: true, runValidators: true })

const deleteById = (id) => HouseholdMember.findByIdAndDelete(id)

module.exports = {
  findAll,
  findById,
  findOne,
  findByClaimCode,
  create,
  updateById,
  deleteById
}
