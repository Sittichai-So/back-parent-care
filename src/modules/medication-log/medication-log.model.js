const mongoose = require('mongoose')

const medicationLogSchema = new mongoose.Schema(
  {
    householdId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Household',
      required: true
    },
    medicineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
      required: true
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HouseholdMember',
      required: true
    },
    status: {
      type: String,
      enum: ['taken', 'missed', 'skipped'],
      default: 'taken'
    },
    takenAt: {
      type: Date,
      default: Date.now
    },
    image: {
      type: String,
      default: null
    },
    note: {
      type: String,
      default: null
    },
    // Always the caller (req.user.id) — kept alongside createdByMemberId
    // since a User account can hold memberships in several households.
    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdByMemberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HouseholdMember',
      required: true
    }
  },
  {
    timestamps: true
  }
)

medicationLogSchema.index({ householdId: 1, memberId: 1 })
medicationLogSchema.index({ medicineId: 1, takenAt: -1 })

module.exports = mongoose.model('MedicationLog', medicationLogSchema)
