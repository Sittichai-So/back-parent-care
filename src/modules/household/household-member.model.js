const mongoose = require('mongoose')

const householdMemberSchema = new mongoose.Schema(
  {
    householdId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Household',
      required: true
    },
    // Optional: a member profile can exist without a linked account (e.g. an
    // elderly relative with no phone of their own). See membershipState,
    // createdByMemberId and claimCode below for how such a profile is
    // managed and later linked to a real account.
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    role: {
      type: String,
      enum: ['owner', 'caregiver', 'elder', 'viewer'],
      required: true
    },
    displayName: {
      type: String,
      required: true,
      trim: true
    },
    relation: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['normal', 'monitor', 'urgent'],
      default: 'normal'
    },
    detail: {
      type: String,
      default: ''
    },
    birthday: {
      type: Date,
      default: null
    },
    gender: {
      type: String,
      default: null
    },
    avatar: {
      type: String,
      default: null
    },
    // 'pending' means an existing account was invited but hasn't accepted
    // yet — unrelated to `status` above, which tracks the member's health
    // check-in state (normal/monitor/urgent). A pending member is NOT a real
    // member of the household yet: householdMiddleware excludes pending
    // rows from granting access.
    membershipState: {
      type: String,
      enum: ['active', 'pending'],
      default: 'active'
    },
    // Who added/manages this profile — set for member profiles created
    // without a linked account (createManagedMember) and for invites
    // (inviteExistingUser). Null for memberships created via household
    // creation or self-service join-by-invite-code.
    createdByMemberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HouseholdMember',
      default: null
    },
    // One-time code that lets a userId-less member profile later be linked
    // to a real account (POST /households/claim), keeping its existing
    // medication/appointment/vitals history. Distinct from Household's
    // inviteCode, which admits a new member into a household rather than
    // attaching an account to one specific existing profile.
    claimCode: {
      type: String,
      default: null,
      uppercase: true,
      trim: true
    },
    claimCodeExpiresAt: {
      type: Date,
      default: null
    },
    // Soft-remove instead of hard delete, so historical Medicine/Appointment/
    // Vital/Task rows keep a valid memberId reference even after someone
    // leaves the household.
    isActive: {
      type: Boolean,
      default: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
)

// One membership per (household, user) — but only enforced while userId is
// actually set. Without the partialFilterExpression, Mongo's unique index
// would treat every userId-less profile's `null` as the same value and
// reject the second one added to a household.
householdMemberSchema.index(
  { householdId: 1, userId: 1 },
  { unique: true, partialFilterExpression: { userId: { $type: 'objectId' } } }
)
householdMemberSchema.index({ householdId: 1, role: 1 })
// Same partial-index reasoning as above: only one member should hold a given
// claim code at a time, but most members have claimCode: null.
householdMemberSchema.index(
  { claimCode: 1 },
  { unique: true, partialFilterExpression: { claimCode: { $type: 'string' } } }
)

module.exports = mongoose.model('HouseholdMember', householdMemberSchema)
