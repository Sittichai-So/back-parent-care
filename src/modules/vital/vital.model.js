const mongoose = require('mongoose')

const vitalSchema = new mongoose.Schema(
  {
    householdId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Household',
      required: true
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HouseholdMember',
      required: true
    },
    // A real moment in time, not a calendar-day label like Appointment.date
    // — a Date object is the right fit here.
    recordedAt: {
      type: Date,
      default: Date.now
    },
    systolic: {
      type: Number,
      default: null
    },
    diastolic: {
      type: Number,
      default: null
    },
    sugar: {
      type: Number,
      default: null
    },
    weight: {
      type: Number,
      default: null
    },
    note: {
      type: String,
      default: null
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

vitalSchema.index({ householdId: 1, memberId: 1, recordedAt: -1 })

module.exports = mongoose.model('Vital', vitalSchema)
