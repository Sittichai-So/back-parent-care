const mongoose = require('mongoose')

// One care-related cost ("ค่าใช้จ่ายเดือนนี้", design screen 11). The dashboard
// renders a monthly total, an item count and a stacked bar split by category,
// all of which are aggregations over these rows rather than stored totals.
const CATEGORIES = ['medicine', 'treatment', 'transport', 'other']

const expenseSchema = new mongoose.Schema(
  {
    householdId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Household',
      required: true
    },
    // Who the cost was for. Nullable for a household-wide cost that isn't
    // attributable to one person.
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HouseholdMember',
      default: null
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    // Slugs, not the Thai labels the chart legend shows — unlike Document.kind
    // these are grouped and summed, so a stable key matters more than matching
    // the rendered string. expense.service.js maps them to the design's labels
    // (ค่ายา · ค่าตรวจอายุรกรรม · ค่าเดินทางโรงพยาบาล · อื่น ๆ) in the summary.
    category: {
      type: String,
      enum: CATEGORIES,
      default: 'other'
    },
    // Thai baht. Stored as a plain Number because the design shows whole-baht
    // figures only and nothing here does currency arithmetic beyond summing.
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    // The calendar day the money was spent, which is what the monthly bucket
    // is computed from — deliberately separate from createdAt, since a cost is
    // often entered days after the fact.
    spentAt: {
      type: Date,
      default: Date.now
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

expenseSchema.index({ householdId: 1, spentAt: -1 })
expenseSchema.index({ householdId: 1, category: 1 })

module.exports = mongoose.model('Expense', expenseSchema)
