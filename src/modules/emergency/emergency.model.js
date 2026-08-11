const mongoose = require('mongoose')

const locationSchema = new mongoose.Schema(
  {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true }
  },
  { _id: false }
)

const emergencyAlertSchema = new mongoose.Schema(
  {
    householdId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Household',
      required: true
    },
    triggeredByMemberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HouseholdMember',
      required: true
    },
    // Usually === triggeredByMemberId (elder self-trigger); differs if a
    // caregiver/owner triggers on an elder's behalf.
    forMemberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HouseholdMember',
      required: true
    },
    message: {
      type: String,
      default: null
    },
    // Not collected by any current screen — kept for forward-compat only.
    location: {
      type: locationSchema,
      default: null
    },
    status: {
      type: String,
      enum: ['active', 'acknowledged', 'resolved'],
      default: 'active'
    }
  },
  {
    timestamps: true
  }
)

emergencyAlertSchema.index({ householdId: 1, status: 1 })
emergencyAlertSchema.index({ householdId: 1, createdAt: -1 })

module.exports = mongoose.model('EmergencyAlert', emergencyAlertSchema)
