const mongoose = require('mongoose')

const medicineSchema = new mongoose.Schema(
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
    name: {
      type: String,
      required: true,
      trim: true
    },
    dosage: {
      type: String,
      required: true
    },
    // What it's for, e.g. "ควบคุมความดันโลหิต" — the frontend form always
    // collects this, so unlike `frequency` it's a first-class field.
    reason: {
      type: String,
      default: null
    },
    // The frontend form never collects a free-text frequency description —
    // `times` is the actual schedule — so this stays optional rather than
    // required as it was under the old single-owner model.
    frequency: {
      type: String,
      default: null
    },
    times: [
      {
        type: String
      }
    ],
    notes: {
      type: String,
      default: null
    },
    startDate: {
      type: Date,
      default: null
    },
    endDate: {
      type: Date,
      default: null
    },
    image: {
      type: String,
      default: null
    },
    isActive: {
      type: Boolean,
      default: true
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

medicineSchema.index({ householdId: 1, memberId: 1 })
medicineSchema.index({ householdId: 1, isActive: 1 })

module.exports = mongoose.model('Medicine', medicineSchema)
