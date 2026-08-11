const mongoose = require('mongoose')

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    // Nullable — a user's inbox can span several households, and some
    // notifications (future account-level system notices) aren't tied to one.
    householdId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Household',
      default: null
    },
    type: {
      type: String,
      enum: ['MEDICINE', 'APPOINTMENT', 'SYSTEM', 'EMERGENCY', 'TASK', 'VITALS'],
      default: 'SYSTEM'
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    data: {
      type: Object,
      default: {}
    },
    isRead: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
)

notificationSchema.index({ userId: 1, isRead: 1 })
notificationSchema.index({ householdId: 1, createdAt: -1 })

module.exports = mongoose.model('Notification', notificationSchema)
