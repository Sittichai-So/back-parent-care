const mongoose = require('mongoose')

const householdSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    ownerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    // Which sort of household this is — drives the group pill's icon and the
    // "<kind label> · <n> คน" meta line in the design's group switcher sheet
    // (บ้านพ่อแม่ HouseLine · บ้านแฟน Heart · บ้านญาติ UsersFour · บ้านอื่น Buildings).
    // Defaults to 'other' so households created before this field existed,
    // and any client that doesn't send it, stay valid.
    kind: {
      type: String,
      enum: ['parents', 'partner', 'relatives', 'other'],
      default: 'other'
    },
    inviteCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    inviteCodeRotatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
)

module.exports = mongoose.model('Household', householdSchema)
