const mongoose = require('mongoose')

// One chat message in a household's family conversation (design screen 08,
// "ข้อความครอบครัว"). There is exactly one room per household — the design
// has no sub-channels or direct messages — so householdId alone identifies
// the conversation and doubles as the Socket.IO room name.
const messageSchema = new mongoose.Schema(
  {
    householdId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Household',
      required: true
    },
    // Who sent it, as a household member — the frontend renders the bubble's
    // name from this and decides "mine" by comparing it to its own
    // currentMembershipId, so it must be the membership id, not the user id.
    senderMemberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HouseholdMember',
      required: true
    },
    // Kept alongside senderMemberId for the same reason MedicationLog keeps
    // createdByUserId: one account can hold memberships in several
    // households, and this is the identity the socket handshake authenticated.
    //
    // Nullable for the same reason HouseholdMember.userId is: a member profile
    // with no linked account (an elder with no phone) can still be the
    // attributed sender of a message recorded on their behalf. Anything
    // arriving over the socket or REST always has one, because both paths
    // require an authenticated caller.
    senderUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    text: {
      type: String,
      required: true,
      trim: true
    },
    // Soft-delete so a removed message leaves the conversation's ordering
    // intact rather than reshuffling everyone's scroll position.
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
)

// The only read pattern is "latest N in this household, newest first" (then
// reversed for display) plus the `before` cursor for older pages.
messageSchema.index({ householdId: 1, createdAt: -1 })

module.exports = mongoose.model('Message', messageSchema)
