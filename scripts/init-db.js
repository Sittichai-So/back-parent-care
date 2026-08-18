/**
 * Creates/updates every collection this backend uses, with a MongoDB
 * $jsonSchema validator + indexes mirroring the Mongoose models under
 * src/modules/**\/*.model.js. Safe to re-run — creates the collection if
 * missing, otherwise updates its validator in place via collMod.
 *
 * Usage: mongosh "<connection string>" scripts/init-db.js
 * (or via the ./init-db.sh wrapper, which reads MONGODB_URI from .env)
 *
 * validationLevel is 'moderate' everywhere: only NEW/MODIFIED documents are
 * checked against the schema, so this never breaks on pre-existing data
 * while the schema is still evolving during development.
 *
 * NOTE on HouseholdMember.userId being optional: a household member can
 * exist with no linked account of their own (e.g. an elder with no phone),
 * added via createManagedMember and later linked to a real account via a
 * claimCode. See src/modules/household/household-member.model.js for the
 * full rationale. Before running this against a database that already has
 * userId-less members' worth of traffic, make sure
 * scripts/migrate-add-member-feature.js has replaced the old plain unique
 * index on {householdId, userId} with the partial one — this script's index
 * list below only reflects the target end state, it doesn't migrate.
 */

function ensureCollection(db, name, jsonSchema, indexes) {
  const exists = db.getCollectionNames().includes(name)

  if (!exists) {
    db.createCollection(name, {
      validator: { $jsonSchema: jsonSchema },
      validationLevel: 'moderate'
    })
    print(`created collection: ${name}`)
  } else {
    db.runCommand({
      collMod: name,
      validator: { $jsonSchema: jsonSchema },
      validationLevel: 'moderate'
    })
    print(`updated validator: ${name}`)
  }

  indexes.forEach(({ keys, options }) => {
    db.getCollection(name).createIndex(keys, options || {})
  })
  print(`  ensured ${indexes.length} index(es) on ${name}`)
}

const objectId = { bsonType: 'objectId' }
const objectIdOrNull = { bsonType: ['objectId', 'null'] }
const stringOrNull = { bsonType: ['string', 'null'] }
const dateOrNull = { bsonType: ['date', 'null'] }
const numberOrNull = { bsonType: ['double', 'int', 'long', 'null'] }
const bool = { bsonType: 'bool' }

// ---------------------------------------------------------------------
// users (src/modules/auth/auth.model.js)
// ---------------------------------------------------------------------
ensureCollection(
  db,
  'users',
  {
    bsonType: 'object',
    required: ['name', 'email', 'password'],
    properties: {
      name: { bsonType: 'string' },
      email: { bsonType: 'string' },
      password: { bsonType: 'string' },
      // Exact-match lookup code so other users can find this account without
      // an open name search (see /users/lookup). Null until the
      // migrate-add-member-feature.js backfill runs for pre-existing users.
      userCode: stringOrNull,
      phone: stringOrNull,
      profileImage: stringOrNull,
      role: { bsonType: 'string' },
      isActive: bool
    }
  },
  [
    { keys: { email: 1 }, options: { unique: true } },
    {
      keys: { userCode: 1 },
      options: { unique: true, partialFilterExpression: { userCode: { $type: 'string' } } }
    }
  ]
)

// ---------------------------------------------------------------------
// userprofiles (src/modules/user/user.model.js)
// ---------------------------------------------------------------------
ensureCollection(
  db,
  'userprofiles',
  {
    bsonType: 'object',
    required: ['userId', 'fullName'],
    properties: {
      userId: objectId,
      fullName: { bsonType: 'string' },
      email: { bsonType: 'string' },
      phone: stringOrNull,
      profileImage: stringOrNull,
      settings: { bsonType: 'object' }
    }
  },
  [{ keys: { userId: 1 }, options: { unique: true } }]
)

// ---------------------------------------------------------------------
// households (src/modules/household/household.model.js)
// ---------------------------------------------------------------------
ensureCollection(
  db,
  'households',
  {
    bsonType: 'object',
    required: ['name', 'ownerUserId', 'inviteCode'],
    properties: {
      name: { bsonType: 'string' },
      ownerUserId: objectId,
      // Group kind behind the switcher's icon + "<label> · <n> คน" meta line.
      kind: { enum: ['parents', 'partner', 'relatives', 'other'] },
      inviteCode: { bsonType: 'string' },
      inviteCodeRotatedAt: { bsonType: 'date' }
    }
  },
  [{ keys: { inviteCode: 1 }, options: { unique: true } }, { keys: { ownerUserId: 1 } }]
)

// ---------------------------------------------------------------------
// householdmembers (src/modules/household/household-member.model.js)
// ---------------------------------------------------------------------
ensureCollection(
  db,
  'householdmembers',
  {
    bsonType: 'object',
    required: ['householdId', 'role', 'displayName', 'relation'],
    properties: {
      householdId: objectId,
      userId: objectIdOrNull,
      role: { enum: ['owner', 'caregiver', 'elder', 'viewer'] },
      displayName: { bsonType: 'string' },
      relation: { bsonType: 'string' },
      status: { enum: ['normal', 'monitor', 'urgent'] },
      detail: { bsonType: 'string' },
      birthday: dateOrNull,
      gender: stringOrNull,
      avatar: stringOrNull,
      // 'pending' = an existing account was invited but hasn't accepted yet.
      // Unrelated to `status` above (health check-in state).
      membershipState: { enum: ['active', 'pending'] },
      createdByMemberId: objectIdOrNull,
      claimCode: stringOrNull,
      claimCodeExpiresAt: dateOrNull,
      // Which household opens on sign-in, per user — see the model for why
      // this lives on the membership rather than on Household.
      isDefault: bool,
      isActive: bool,
      joinedAt: { bsonType: 'date' }
    }
  },
  [
    {
      keys: { householdId: 1, userId: 1 },
      options: { unique: true, partialFilterExpression: { userId: { $type: 'objectId' } } }
    },
    { keys: { householdId: 1, role: 1 } },
    {
      keys: { claimCode: 1 },
      options: { unique: true, partialFilterExpression: { claimCode: { $type: 'string' } } }
    }
  ]
)

// ---------------------------------------------------------------------
// medicines (src/modules/medicine/medicine.model.js)
// ---------------------------------------------------------------------
ensureCollection(
  db,
  'medicines',
  {
    bsonType: 'object',
    required: ['householdId', 'memberId', 'name', 'dosage'],
    properties: {
      householdId: objectId,
      memberId: objectId,
      name: { bsonType: 'string' },
      dosage: { bsonType: 'string' },
      reason: stringOrNull,
      frequency: stringOrNull,
      times: { bsonType: 'array', items: { bsonType: 'string' } },
      notes: stringOrNull,
      startDate: dateOrNull,
      endDate: dateOrNull,
      image: stringOrNull,
      isActive: bool,
      createdByMemberId: objectIdOrNull
    }
  },
  [{ keys: { householdId: 1, memberId: 1 } }, { keys: { householdId: 1, isActive: 1 } }]
)

// ---------------------------------------------------------------------
// medicationlogs (src/modules/medication-log/medication-log.model.js)
// ---------------------------------------------------------------------
ensureCollection(
  db,
  'medicationlogs',
  {
    bsonType: 'object',
    required: ['householdId', 'medicineId', 'memberId', 'status', 'createdByUserId', 'createdByMemberId'],
    properties: {
      householdId: objectId,
      medicineId: objectId,
      memberId: objectId,
      status: { enum: ['taken', 'missed', 'skipped'] },
      takenAt: { bsonType: 'date' },
      image: stringOrNull,
      // When the confirmation photo was shot, as opposed to takenAt (when the
      // dose was confirmed) — shown as separate rows in the confirm flow.
      photoTakenAt: dateOrNull,
      note: stringOrNull,
      createdByUserId: objectId,
      createdByMemberId: objectId
    }
  },
  [{ keys: { householdId: 1, memberId: 1 } }, { keys: { medicineId: 1, takenAt: -1 } }]
)

// ---------------------------------------------------------------------
// appointments (src/modules/appointment/appointment.model.js)
// ---------------------------------------------------------------------
ensureCollection(
  db,
  'appointments',
  {
    bsonType: 'object',
    required: ['householdId', 'memberId', 'title', 'date', 'time', 'hospital'],
    properties: {
      householdId: objectId,
      memberId: objectId,
      title: { bsonType: 'string' },
      // Deliberately strings, not Date — see appointment.model.js for why.
      date: { bsonType: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
      time: { bsonType: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$' },
      hospital: { bsonType: 'string' },
      doctor: stringOrNull,
      department: stringOrNull,
      notes: stringOrNull,
      medicationNote: stringOrNull,
      linkedMedicationIds: { bsonType: 'array', items: objectId },
      reminderEnabled: bool,
      status: { bsonType: 'string' },
      createdByMemberId: objectIdOrNull
    }
  },
  [{ keys: { householdId: 1, memberId: 1 } }, { keys: { householdId: 1, date: 1 } }]
)

// ---------------------------------------------------------------------
// vitals (src/modules/vital/vital.model.js)
// ---------------------------------------------------------------------
ensureCollection(
  db,
  'vitals',
  {
    bsonType: 'object',
    required: ['householdId', 'memberId', 'createdByMemberId'],
    properties: {
      householdId: objectId,
      memberId: objectId,
      recordedAt: { bsonType: 'date' },
      systolic: numberOrNull,
      diastolic: numberOrNull,
      // Beats per minute — the design's member-detail card shows a ชีพจร tile
      // alongside ความดัน and น้ำตาล.
      pulse: numberOrNull,
      sugar: numberOrNull,
      weight: numberOrNull,
      note: stringOrNull,
      createdByMemberId: objectId
    }
  },
  [{ keys: { householdId: 1, memberId: 1, recordedAt: -1 } }]
)

// ---------------------------------------------------------------------
// tasks (src/modules/task/task.model.js)
// ---------------------------------------------------------------------
ensureCollection(
  db,
  'tasks',
  {
    bsonType: 'object',
    required: ['householdId', 'title', 'status', 'createdByMemberId'],
    properties: {
      householdId: objectId,
      title: { bsonType: 'string' },
      detail: { bsonType: 'string' },
      status: { enum: ['pending', 'in-progress', 'done'] },
      assignedToMemberId: objectIdOrNull,
      relatedType: { enum: ['checkin', 'medication', 'appointment', 'vitals', 'custom'] },
      dueAt: dateOrNull,
      createdByMemberId: objectId
    }
  },
  [{ keys: { householdId: 1, status: 1 } }, { keys: { householdId: 1, assignedToMemberId: 1 } }]
)

// ---------------------------------------------------------------------
// timelineevents (src/modules/timeline/timeline.model.js) — append-only
// ---------------------------------------------------------------------
ensureCollection(
  db,
  'timelineevents',
  {
    bsonType: 'object',
    required: ['householdId', 'type', 'title'],
    properties: {
      householdId: objectId,
      actorMemberId: objectIdOrNull,
      relatedMemberId: objectIdOrNull,
      type: { enum: ['check-in', 'medication', 'task', 'appointment', 'vitals', 'emergency', 'member-joined'] },
      title: { bsonType: 'string' },
      detail: { bsonType: 'string' },
      relatedId: objectIdOrNull,
      occurredAt: { bsonType: 'date' }
    }
  },
  [{ keys: { householdId: 1, occurredAt: -1 } }, { keys: { householdId: 1, type: 1 } }]
)

// ---------------------------------------------------------------------
// emergencyalerts (src/modules/emergency/emergency.model.js)
// ---------------------------------------------------------------------
ensureCollection(
  db,
  'emergencyalerts',
  {
    bsonType: 'object',
    required: ['householdId', 'triggeredByMemberId', 'forMemberId', 'status'],
    properties: {
      householdId: objectId,
      triggeredByMemberId: objectId,
      forMemberId: objectId,
      message: stringOrNull,
      location: {
        bsonType: ['object', 'null'],
        properties: {
          latitude: { bsonType: 'double' },
          longitude: { bsonType: 'double' }
        }
      },
      status: { enum: ['active', 'acknowledged', 'resolved'] }
    }
  },
  [{ keys: { householdId: 1, status: 1 } }, { keys: { householdId: 1, createdAt: -1 } }]
)

// ---------------------------------------------------------------------
// notifications (src/modules/notification/notification.model.js)
// ---------------------------------------------------------------------
ensureCollection(
  db,
  'notifications',
  {
    bsonType: 'object',
    required: ['userId', 'type', 'title', 'message'],
    properties: {
      userId: objectId,
      householdId: objectIdOrNull,
      type: { enum: ['MEDICINE', 'APPOINTMENT', 'SYSTEM', 'EMERGENCY', 'TASK', 'VITALS'] },
      title: { bsonType: 'string' },
      message: { bsonType: 'string' },
      data: { bsonType: 'object' },
      isRead: bool
    }
  },
  [{ keys: { userId: 1, isRead: 1 } }, { keys: { householdId: 1, createdAt: -1 } }]
)

// ---------------------------------------------------------------------
// messages (src/modules/message/message.model.js) — family group chat
// ---------------------------------------------------------------------
ensureCollection(
  db,
  'messages',
  {
    bsonType: 'object',
    required: ['householdId', 'senderMemberId', 'text'],
    properties: {
      householdId: objectId,
      senderMemberId: objectId,
      // Null only where the sender is a member profile with no linked
      // account — see message.model.js.
      senderUserId: objectIdOrNull,
      text: { bsonType: 'string' },
      isDeleted: bool
    }
  },
  [{ keys: { householdId: 1, createdAt: -1 } }]
)

// ---------------------------------------------------------------------
// handoffnotes (src/modules/handoff-note/handoff-note.model.js)
// ---------------------------------------------------------------------
ensureCollection(
  db,
  'handoffnotes',
  {
    bsonType: 'object',
    required: ['householdId', 'authorMemberId', 'text'],
    properties: {
      householdId: objectId,
      authorMemberId: objectId,
      text: { bsonType: 'string' }
    }
  },
  [{ keys: { householdId: 1, createdAt: -1 } }]
)

// ---------------------------------------------------------------------
// documents (src/modules/document/document.model.js)
// ---------------------------------------------------------------------
ensureCollection(
  db,
  'documents',
  {
    bsonType: 'object',
    required: ['householdId', 'name', 'kind', 'createdByMemberId'],
    properties: {
      householdId: objectId,
      // Null for paperwork that belongs to the household rather than one
      // person (e.g. the group insurance policy).
      memberId: objectIdOrNull,
      name: { bsonType: 'string' },
      kind: { enum: ['ID', 'สิทธิ์', 'ประกัน', 'PDF'] },
      meta: { bsonType: 'string' },
      referenceNumber: stringOrNull,
      issuedAt: dateOrNull,
      expiresAt: dateOrNull,
      fileUrl: stringOrNull,
      createdByMemberId: objectId
    }
  },
  [{ keys: { householdId: 1, memberId: 1 } }, { keys: { householdId: 1, kind: 1 } }]
)

// ---------------------------------------------------------------------
// expenses (src/modules/expense/expense.model.js)
// ---------------------------------------------------------------------
ensureCollection(
  db,
  'expenses',
  {
    bsonType: 'object',
    required: ['householdId', 'title', 'amount', 'createdByMemberId'],
    properties: {
      householdId: objectId,
      memberId: objectIdOrNull,
      title: { bsonType: 'string' },
      category: { enum: ['medicine', 'treatment', 'transport', 'other'] },
      amount: { bsonType: ['double', 'int', 'long'], minimum: 0 },
      // The day the money was spent — the monthly bucket is computed from
      // this, not from createdAt.
      spentAt: { bsonType: 'date' },
      note: stringOrNull,
      createdByMemberId: objectId
    }
  },
  [{ keys: { householdId: 1, spentAt: -1 } }, { keys: { householdId: 1, category: 1 } }]
)

// ---------------------------------------------------------------------
// hospitals (src/modules/hospital/hospital.model.js) — unchanged, a flat
// public directory not scoped to any household.
// ---------------------------------------------------------------------
ensureCollection(
  db,
  'hospitals',
  {
    bsonType: 'object',
    required: ['name', 'address', 'province', 'district'],
    properties: {
      name: { bsonType: 'string' },
      address: { bsonType: 'string' },
      province: { bsonType: 'string' },
      district: { bsonType: 'string' },
      phone: stringOrNull,
      latitude: numberOrNull,
      longitude: numberOrNull
    }
  },
  [{ keys: { province: 1, district: 1 } }]
)

print('\ninit-db.js complete.')
