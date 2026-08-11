const mongoose = require('mongoose')

const appointmentSchema = new mongoose.Schema(
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
    title: {
      type: String,
      required: true,
      trim: true
    },
    // Stored as the same "YYYY-MM-DD"/"HH:mm" strings the frontend already
    // uses, not Date objects — sidesteps timezone-shift bugs from round-
    // tripping a local calendar day through UTC.
    date: {
      type: String,
      required: true
    },
    time: {
      type: String,
      required: true
    },
    // Free text, not a Hospital directory reference — the frontend has no
    // hospital lookup UI, it's just typed in.
    hospital: {
      type: String,
      required: true,
      trim: true
    },
    doctor: {
      type: String,
      default: null
    },
    department: {
      type: String,
      default: null
    },
    notes: {
      type: String,
      default: null
    },
    medicationNote: {
      type: String,
      default: null
    },
    linkedMedicationIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Medicine'
      }
    ],
    // Reminders are scheduled purely on-device via expo-notifications — the
    // backend never needs a fire time, just whether they're wanted.
    reminderEnabled: {
      type: Boolean,
      default: true
    },
    status: {
      type: String,
      default: 'scheduled'
    },
    createdByMemberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HouseholdMember',
      default: null
    }
  },
  {
    timestamps: true
  }
)

appointmentSchema.index({ householdId: 1, memberId: 1 })
appointmentSchema.index({ householdId: 1, date: 1 })

module.exports = mongoose.model('Appointment', appointmentSchema)
