const mongoose = require('mongoose')

// A shift-handoff note left for whoever cares for the household next
// ("บันทึกส่งต่อเวร", design screen 10). Household-wide rather than about one
// member: the design's note cards show only the author, a time and the text,
// with no "about whom" field, so none is invented here.
const handoffNoteSchema = new mongoose.Schema(
  {
    householdId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Household',
      required: true
    },
    authorMemberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HouseholdMember',
      required: true
    },
    text: {
      type: String,
      required: true,
      trim: true
    }
  },
  {
    timestamps: true
  }
)

// The screen lists newest-first and never filters, so one index covers it.
handoffNoteSchema.index({ householdId: 1, createdAt: -1 })

module.exports = mongoose.model('HandoffNote', handoffNoteSchema)
