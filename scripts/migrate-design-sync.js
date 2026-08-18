/**
 * Backfills the fields added while syncing the backend to the "Parent Care v3"
 * design handoff, for documents written before those fields existed.
 *
 * Usage: node scripts/migrate-design-sync.js
 *
 * Every field here has a Mongoose default, but a default only applies to
 * documents Mongoose itself writes — it never rewrites rows already in the
 * collection. So without this, an older household comes back with `kind`
 * absent rather than 'other', and clients have to treat "missing" and
 * "default" as two separate cases.
 *
 * Safe to re-run: each update is filtered to rows where the field is still
 * missing, so a second run matches nothing.
 */

const mongoose = require('mongoose')
const { loadEnv } = require('../src/config/env')
const { connectDatabase } = require('../src/config/database')

const Household = require('../src/modules/household/household.model')
const HouseholdMember = require('../src/modules/household/household-member.model')

const run = async () => {
  loadEnv()
  await connectDatabase()

  const households = await Household.updateMany({ kind: { $exists: false } }, { $set: { kind: 'other' } })
  console.log(`households: set kind='other' on ${households.modifiedCount} row(s)`)

  const members = await HouseholdMember.updateMany(
    { isDefault: { $exists: false } },
    { $set: { isDefault: false } }
  )
  console.log(`householdmembers: set isDefault=false on ${members.modifiedCount} row(s)`)

  // Deliberately not backfilled: MedicationLog.photoTakenAt and Vital.pulse
  // stay absent on historical rows. Both mean "this reading was never
  // recorded", which is exactly what a missing value should say — writing an
  // explicit null would claim the same thing less clearly, and writing
  // anything else would invent data.

  await mongoose.connection.close()
}

run().catch(async (error) => {
  console.error('Migration failed:', error)
  await mongoose.connection.close().catch(() => {})
  process.exit(1)
})
