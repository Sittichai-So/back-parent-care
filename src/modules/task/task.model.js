const mongoose = require('mongoose')

const taskSchema = new mongoose.Schema(
  {
    householdId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Household',
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    detail: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'done'],
      default: 'pending'
    },
    assignedToMemberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HouseholdMember',
      default: null
    },
    // Drives the frontend's task icon — replaces the old hardcoded lookup
    // keyed on a task's id, which broke as soon as ids weren't the 3
    // hardcoded demo strings anymore.
    relatedType: {
      type: String,
      enum: ['checkin', 'medication', 'appointment', 'vitals', 'custom'],
      default: 'custom'
    },
    dueAt: {
      type: Date,
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

taskSchema.index({ householdId: 1, status: 1 })
taskSchema.index({ householdId: 1, assignedToMemberId: 1 })

// Matches the frontend's existing FamilyTask.owner field (a plain display
// name string) without the frontend needing to know about memberIds.
taskSchema.virtual('owner').get(function computeOwner() {
  return this.assignedToMemberId && this.assignedToMemberId.displayName ? this.assignedToMemberId.displayName : null
})

taskSchema.set('toJSON', { virtuals: true })
taskSchema.set('toObject', { virtuals: true })

module.exports = mongoose.model('Task', taskSchema)
