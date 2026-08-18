const mongoose = require('mongoose')

// A stored document or entitlement ("เอกสารและสิทธิ์", design screen 10):
// ID cards, healthcare entitlements, insurance policies, medical
// certificates.
const documentSchema = new mongoose.Schema(
  {
    householdId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Household',
      required: true
    },
    // Whose document it is. Nullable because two of the design's four rows
    // belong to the household rather than one person (the group insurance
    // policy and the medical certificate show no member name).
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HouseholdMember',
      default: null
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    // The design's kind pill, stored as the label it renders — the frontend
    // prints this string straight into the pill and picks the row icon from
    // it, so a slug here would only force a translation table on both sides.
    kind: {
      type: String,
      enum: ['ID', 'สิทธิ์', 'ประกัน', 'PDF'],
      required: true
    },
    // The row's grey meta line. Free text because the design's four rows say
    // structurally different things — "อัปเดต <date>", "ใช้ได้ถึง <date>",
    // "กรมธรรม์ <number>", "ออก <date> · <doctor>" — and the frontend renders
    // it verbatim. The structured fields below carry the same facts for
    // anything that needs to sort or expire on them.
    meta: {
      type: String,
      default: ''
    },
    referenceNumber: {
      type: String,
      default: null
    },
    issuedAt: {
      type: Date,
      default: null
    },
    expiresAt: {
      type: Date,
      default: null
    },
    // Where the file itself lives, once uploaded via /api/uploads. Null for a
    // row that records an entitlement with no scan attached.
    fileUrl: {
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

documentSchema.index({ householdId: 1, memberId: 1 })
documentSchema.index({ householdId: 1, kind: 1 })

module.exports = mongoose.model('Document', documentSchema)
