const UserProfile = require('./user.model')

const findByUserId = async (userId) => {
  return UserProfile.findOne({ userId })
}

const createOrUpdate = async (userId, data) => {
  return UserProfile.findOneAndUpdate({ userId }, data, {
    new: true,
    upsert: true,
    runValidators: true
  })
}

module.exports = {
  findByUserId,
  createOrUpdate
}
