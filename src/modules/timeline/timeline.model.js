const mongoose = require('mongoose')

const timelineEventSchema = new mongoose.Schema(
  {
    householdId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Household',
      required: true
    },
    // Who did it. Null means system-generated.
    actorMemberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HouseholdMember',
      default: null
    },
    // Who it concerns (usually the same as actorMemberId, but e.g. a
    // caregiver confirming a dose "for" an elder differs).
    relatedMemberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HouseholdMember',
      default: null
    },
    type: {
      type: String,
      enum: ['check-in', 'medication', 'task', 'appointment', 'vitals', 'emergency', 'member-joined'],
      required: true
    },
    title: {
      type: String,
      required: true
    },
    detail: {
      type: String,
      default: ''
    },
    // Id of the Medicine/Appointment/Vital/Task/EmergencyAlert doc this event
    // is about. Left untyped since the target collection varies by `type`.
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    occurredAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
)

timelineEventSchema.index({ householdId: 1, occurredAt: -1 })
timelineEventSchema.index({ householdId: 1, type: 1 })

module.exports = mongoose.model('TimelineEvent', timelineEventSchema)
