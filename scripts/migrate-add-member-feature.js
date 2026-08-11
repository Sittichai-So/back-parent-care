/**
 * One-time data migration for the "3-way add member" feature (see
 * PLAN-add-member-feature.md). Run this ONCE at deploy time, before (or in
 * the same release as) the new application code goes live:
 *
 *   node scripts/migrate-add-member-feature.js
 *
 * It is safe to re-run — every step only touches documents/indexes that
 * still need it.
 *
 * What it does:
 *   1. Backfills `membershipState: 'active'` onto every existing
 *      HouseholdMember document that predates the field. (Not strictly
 *      required for correctness — householdMiddleware treats a missing
 *      field as active via `{ $ne: 'pending' }` — but keeps the data
 *      consistent with the schema default going forward.)
 *   2. Backfills a unique `userCode` onto every existing User document that
 *      doesn't have one yet, so already-registered users can be looked up
 *      the same way new registrants are.
 *   3. Replaces the old plain unique index on
 *      HouseholdMember{householdId, userId} with a partial unique index
 *      (only enforced where userId is set), so multiple userId-less member
 *      profiles can coexist in the same household. This step MUST run
 *      before any userId-less member is created, or Mongo will reject the
 *      second one with a duplicate-key error on the old index.
 */

const { loadEnv } = require('../src/config/env')
const { connectDatabase } = require('../src/config/database')
const mongoose = require('mongoose')
const HouseholdMember = require('../src/modules/household/household-member.model')
const User = require('../src/modules/auth/auth.model')
const { generateUserCode } = require('../src/utils/invite-code')

const backfillMembershipState = async () => {
  const result = await HouseholdMember.updateMany(
    { membershipState: { $exists: false } },
    { $set: { membershipState: 'active' } }
  )
  console.log(`membershipState backfilled on ${result.modifiedCount} household member(s)`)
}

const backfillUserCodes = async () => {
  const usersMissingCode = await User.find({ userCode: null }).select('_id')
  let updated = 0

  // Sequential on purpose: each code must be checked against what was just
  // assigned, and this only runs once, on however many pre-existing users
  // there are — not worth parallelizing.
  // eslint-disable-next-line no-restricted-syntax
  for (const { _id } of usersMissingCode) {
    let code
    // eslint-disable-next-line no-await-in-loop
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = generateUserCode()
      // eslint-disable-next-line no-await-in-loop
      const existing = await User.findOne({ userCode: candidate })
      if (!existing) {
        code = candidate
        break
      }
    }
    if (!code) {
      throw new Error(`Could not generate a unique userCode for user ${_id}`)
    }
    // eslint-disable-next-line no-await-in-loop
    await User.updateOne({ _id }, { $set: { userCode: code } })
    updated += 1
  }

  console.log(`userCode backfilled on ${updated} user(s)`)
}

const rebuildHouseholdMemberIndex = async () => {
  const collection = HouseholdMember.collection
  const existingIndexes = await collection.indexes()

  const staleIndex = existingIndexes.find(
    (idx) =>
      idx.key &&
      Object.keys(idx.key).join(',') === 'householdId,userId' &&
      !idx.partialFilterExpression
  )

  if (staleIndex) {
    await collection.dropIndex(staleIndex.name)
    console.log(`dropped stale index: ${staleIndex.name}`)
  }

  await HouseholdMember.syncIndexes()
  console.log('household member indexes synced (partial unique on householdId+userId, unique on claimCode)')
}

const run = async () => {
  loadEnv()
  await connectDatabase()

  try {
    // Order matters: the index must allow userId-less members to coexist
    // BEFORE any application traffic (or this migration itself) tries to
    // create one.
    await rebuildHouseholdMemberIndex()
    await backfillMembershipState()
    await backfillUserCodes()
    console.log('Migration complete.')
  } finally {
    await mongoose.disconnect()
  }
}

run().catch((error) => {
  console.error('Migration failed:', error)
  process.exit(1)
})
