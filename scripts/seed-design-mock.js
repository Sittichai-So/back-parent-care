/**
 * Seeds the mock data from the "Parent Care v3" design handoff, owned by one
 * existing account.
 *
 * Usage: node scripts/seed-design-mock.js
 *
 * Everything it writes hangs off the account below — no new User rows are
 * created. The other family members are *managed member profiles*
 * (HouseholdMember with userId: null), the same shape the app's own
 * createManagedMember produces for a relative with no phone of their own.
 *
 * Idempotent: the two design households are looked up by (ownerUserId, name)
 * and their members plus every child record are rebuilt from scratch on each
 * run. Households this script didn't create — including the account's
 * pre-existing "Sopa" — are never touched.
 *
 * Dates: the handoff pins its calendar to 25–30 April, which is only
 * meaningful relative to "today" (the 25th carries a "พรุ่งนี้" tag). Seeding
 * those literal dates would put every appointment in the past and hide them
 * from a frontend that filters to upcoming ones, so the same relative offsets
 * are anchored to the day the script runs. See RELATIVE DATES below.
 */

const mongoose = require('mongoose')
const { loadEnv } = require('../src/config/env')
const { connectDatabase } = require('../src/config/database')

const Household = require('../src/modules/household/household.model')
const HouseholdMember = require('../src/modules/household/household-member.model')
const Medicine = require('../src/modules/medicine/medicine.model')
const MedicationLog = require('../src/modules/medication-log/medication-log.model')
const Appointment = require('../src/modules/appointment/appointment.model')
const Vital = require('../src/modules/vital/vital.model')
const Task = require('../src/modules/task/task.model')
const TimelineEvent = require('../src/modules/timeline/timeline.model')
const Message = require('../src/modules/message/message.model')
const HandoffNote = require('../src/modules/handoff-note/handoff-note.model')
const Document = require('../src/modules/document/document.model')
const Expense = require('../src/modules/expense/expense.model')

// The account every seeded record belongs to.
const OWNER_USER_ID = new mongoose.Types.ObjectId('6a7aeafd509241c02a11b603')

// Stable invite codes so re-running doesn't hand out new ones.
const PARENTS_INVITE_CODE = 'DSGNPRNT'
const PARTNER_INVITE_CODE = 'DSGNPTNR'

// --- RELATIVE DATES ----------------------------------------------------
// The handoff's 25th is "tomorrow", so day N maps to today + (N - 24).
const startOfToday = () => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

const dayOffset = (offset) => {
  const date = startOfToday()
  date.setDate(date.getDate() + offset)
  return date
}

// "YYYY-MM-DD" in local time — Appointment.date is a calendar-day string, not
// a Date, precisely so it never shifts through UTC.
const dateKey = (offset) => {
  const date = dayOffset(offset)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// A wall-clock time on a day relative to today, e.g. at(0, 8, 32) === today 08:32.
const at = (offset, hours, minutes) => {
  const date = dayOffset(offset)
  date.setHours(hours, minutes, 0, 0)
  return date
}

const log = (message) => console.log(message)

/**
 * Finds or creates one of the two design households, then wipes and rebuilds
 * everything under it. Deleting by householdId is what makes the script safe
 * to re-run without piling up duplicates.
 */
const resetHousehold = async ({ name, kind, inviteCode }) => {
  let household = await Household.findOne({ ownerUserId: OWNER_USER_ID, name })

  if (household) {
    household.kind = kind
    await household.save()
    log(`reusing household: ${name} (${household._id})`)
  } else {
    household = await Household.create({ name, kind, ownerUserId: OWNER_USER_ID, inviteCode })
    log(`created household: ${name} (${household._id})`)
  }

  const householdId = household._id
  const scoped = { householdId }

  await Promise.all([
    HouseholdMember.deleteMany(scoped),
    Medicine.deleteMany(scoped),
    MedicationLog.deleteMany(scoped),
    Appointment.deleteMany(scoped),
    Vital.deleteMany(scoped),
    Task.deleteMany(scoped),
    TimelineEvent.deleteMany(scoped),
    Message.deleteMany(scoped),
    HandoffNote.deleteMany(scoped),
    Document.deleteMany(scoped),
    Expense.deleteMany(scoped)
  ])

  return household
}

const seedParentsHousehold = async () => {
  const household = await resetHousehold({
    name: 'บ้านพ่อแม่',
    kind: 'parents',
    inviteCode: PARENTS_INVITE_CODE
  })
  const householdId = household._id

  // --- Members (design screen 04) --------------------------------------
  // Only the first has a linked account; the rest are managed profiles, which
  // is why their userId is null.
  const me = await HouseholdMember.create({
    householdId,
    userId: OWNER_USER_ID,
    role: 'owner',
    displayName: 'aef',
    relation: 'ตัวฉันเอง',
    status: 'normal',
    detail: 'ยาของฉัน 13:00 · รอถ่ายภาพยืนยัน',
    // This is the account's default group — the design seeds บ้านพ่อแม่ as the
    // one that opens on sign-in.
    isDefault: true
  })

  const dad = await HouseholdMember.create({
    householdId,
    userId: null,
    role: 'elder',
    displayName: 'พ่อประสิทธิ์',
    relation: 'พ่อ',
    status: 'monitor',
    detail: 'ยา 12:00 ยังไม่ยืนยัน · Amlodipine 5 mg',
    createdByMemberId: me._id
  })

  const mom = await HouseholdMember.create({
    householdId,
    userId: null,
    role: 'elder',
    displayName: 'แม่สมใจ',
    relation: 'แม่',
    status: 'normal',
    detail: 'เช็กอินแล้ว 08:32 · ยืนยันว่าปกติดี',
    createdByMemberId: me._id
  })

  // The design casts พี่เกษม as a Caregiver with his own login
  // (kasem@gmail.com). Seeding that would mean creating a second User, which
  // this script is explicitly not allowed to do, and the app rejects
  // owner/caregiver for an account-less profile anyway — those roles have to
  // belong to someone who can sign in and act for themself. Seeded as a
  // viewer-level managed profile instead; see the handoff summary's open
  // questions.
  const brother = await HouseholdMember.create({
    householdId,
    userId: null,
    role: 'viewer',
    displayName: 'พี่เกษม',
    relation: 'พี่ชาย',
    status: 'normal',
    detail: 'ผู้ดูแลวันนี้ · 08:00–16:00',
    createdByMemberId: me._id
  })

  log(`  members: ${[me, dad, mom, brother].map((m) => m.displayName).join(', ')}`)

  // --- Medications (design screen 06) ----------------------------------
  const myMedicine = await Medicine.create({
    householdId,
    memberId: me._id,
    name: 'Metformin',
    dosage: '500 mg',
    reason: 'ควบคุมระดับน้ำตาลในเลือด',
    times: ['13:00'],
    isActive: true,
    createdByMemberId: me._id
  })

  const dadMedicine = await Medicine.create({
    householdId,
    memberId: dad._id,
    name: 'Amlodipine',
    dosage: '5 mg',
    reason: 'ควบคุมความดันโลหิต',
    times: ['12:00'],
    isActive: true,
    createdByMemberId: me._id
  })

  const momMedicine = await Medicine.create({
    householdId,
    memberId: mom._id,
    name: 'Simvastatin',
    dosage: '10 mg',
    reason: 'ควบคุมไขมันในเลือด',
    times: ['20:00'],
    isActive: true,
    createdByMemberId: me._id
  })

  // Only mom's dose is confirmed today — the design's seeded state is
  // "me idle · dad idle · mom done (shot 08:30, confirmed 08:32)". This log is
  // what makes Medicine.lastTakenAt come back non-null for her, since that
  // field is derived from the log rather than stored.
  await MedicationLog.create({
    householdId,
    medicineId: momMedicine._id,
    memberId: mom._id,
    status: 'taken',
    photoTakenAt: at(0, 8, 30),
    takenAt: at(0, 8, 32),
    createdByUserId: OWNER_USER_ID,
    createdByMemberId: me._id
  })

  log('  medications: Metformin (me), Amlodipine (dad), Simvastatin (mom, confirmed 08:32)')

  // --- Appointments (design screen 07) ---------------------------------
  // The handoff names the escort ("ผู้พา") for each visit but not the patient,
  // except for the one it marks "ของฉัน". memberId below is inferred from the
  // context of each visit and the escort is preserved verbatim in `notes` —
  // flagged in the summary as a point for the design/frontend team to confirm.
  const appointments = [
    {
      memberId: dad._id,
      title: 'ตรวจสุขภาพ · อายุรกรรม',
      date: dateKey(1),
      time: '08:00',
      hospital: 'โรงพยาบาลกรุงเทพ',
      doctor: 'หมอพงศ์',
      department: 'อายุรกรรม',
      notes: 'ผู้พา: พี่เกษม'
    },
    {
      memberId: dad._id,
      title: 'รับยาต่อเนื่อง 3 เดือน',
      date: dateKey(2),
      time: '12:00',
      hospital: 'ห้องยาผู้ป่วยนอก ชั้น 2',
      doctor: 'เภสัชกรวิภา',
      department: 'เภสัชกรรม',
      notes: 'ผู้พา: aef'
    },
    {
      memberId: mom._id,
      title: 'นัดหมอหัวใจ',
      date: dateKey(4),
      time: '15:30',
      hospital: 'ศูนย์หัวใจ ชั้น 4',
      doctor: 'หมอวราภรณ์',
      department: 'อายุรกรรมหัวใจ',
      notes: 'ผู้พา: พี่เกษม'
    },
    {
      memberId: me._id,
      title: 'ตรวจสุขภาพประจำปี',
      date: dateKey(5),
      time: '07:30',
      hospital: 'ศูนย์ตรวจสุขภาพ ชั้น 3',
      doctor: 'หมอณัฐ',
      department: 'ตรวจสุขภาพ',
      notes: 'ผู้เข้ารับ: aef (ฉัน)'
    },
    {
      memberId: mom._id,
      title: 'กายภาพบำบัดเข่า',
      date: dateKey(6),
      time: '10:00',
      hospital: 'แผนกกายภาพ ชั้น 1',
      doctor: 'ครูกิ่ง',
      department: 'กายภาพบำบัด',
      notes: 'ผู้พา: แม่สมใจ'
    }
  ]

  await Appointment.insertMany(
    appointments.map((appointment) => ({
      ...appointment,
      householdId,
      reminderEnabled: true,
      createdByMemberId: me._id
    }))
  )
  log(`  appointments: ${appointments.length} (${dateKey(1)} → ${dateKey(6)})`)

  // --- Vitals (design screen 05) ---------------------------------------
  // Two records rather than one because the design's three tiles carry two
  // different times: ความดัน/ชีพจร at 08:40 and น้ำตาล at 07:10.
  await Vital.create({
    householdId,
    memberId: dad._id,
    recordedAt: at(0, 8, 40),
    systolic: 128,
    diastolic: 82,
    pulse: 74,
    createdByMemberId: me._id
  })

  await Vital.create({
    householdId,
    memberId: dad._id,
    recordedAt: at(0, 7, 10),
    sugar: 102,
    createdByMemberId: me._id
  })
  log('  vitals: 128/82 · ชีพจร 74 · น้ำตาล 102 (พ่อประสิทธิ์)')

  // --- Tasks (design screen 03, "งานอื่นวันนี้") -------------------------
  await Task.insertMany([
    {
      householdId,
      title: 'เช็กอินประจำวัน',
      detail: 'แม่สมใจยืนยันว่าปกติดี',
      status: 'done',
      assignedToMemberId: mom._id,
      relatedType: 'checkin',
      createdByMemberId: me._id
    },
    {
      householdId,
      title: 'พาไปนัดตรวจสุขภาพ',
      detail: 'พี่เกษมรับผิดชอบพาพ่อประสิทธิ์ไปโรงพยาบาล',
      status: 'in-progress',
      assignedToMemberId: brother._id,
      relatedType: 'appointment',
      createdByMemberId: me._id
    }
  ])
  log('  tasks: 2')

  // --- Family chat (design screen 08) ----------------------------------
  // Inserted with explicit createdAt so the conversation reads in the design's
  // order; two of the three senders are account-less managed profiles, hence
  // senderUserId: null.
  await Message.insertMany([
    {
      householdId,
      senderMemberId: me._id,
      senderUserId: OWNER_USER_ID,
      text: 'อรุณสวัสดิ์ครับ ฝากช่วยเตือนพ่อเรื่องยา 12:00 ด้วย',
      createdAt: at(0, 7, 58),
      updatedAt: at(0, 7, 58)
    },
    {
      householdId,
      senderMemberId: mom._id,
      senderUserId: null,
      text: 'ยืนยันว่าวันนี้ปกติดี ทานยาแล้วนะ',
      createdAt: at(0, 8, 33),
      updatedAt: at(0, 8, 33)
    },
    {
      householdId,
      senderMemberId: brother._id,
      senderUserId: null,
      text: 'เตรียมเอกสารเรียบร้อย พรุ่งนี้ผมไปรับพ่อเอง',
      createdAt: at(0, 10, 22),
      updatedAt: at(0, 10, 22)
    }
  ])
  log('  messages: 3')

  // --- Handoff notes (design screen 10) --------------------------------
  await HandoffNote.insertMany([
    {
      householdId,
      authorMemberId: brother._id,
      text: 'แม่สมใจทานยาเช้าแล้ว เพิ่ม photo confirmation ในระบบ',
      createdAt: at(0, 8, 45),
      updatedAt: at(0, 8, 45)
    },
    {
      householdId,
      authorMemberId: brother._id,
      text: 'รับผิดชอบจัดเตรียมเอกสารไปโรงพยาบาลพรุ่งนี้ 09:00',
      createdAt: at(0, 10, 20),
      updatedAt: at(0, 10, 20)
    }
  ])
  log('  handoff notes: 2')

  // --- Documents (design screen 10) ------------------------------------
  await Document.insertMany([
    {
      householdId,
      memberId: mom._id,
      name: 'บัตรประชาชน',
      kind: 'ID',
      meta: 'แม่สมใจ · อัปเดต 2 มิ.ย. 2568',
      issuedAt: new Date(2025, 5, 2),
      createdByMemberId: me._id
    },
    {
      householdId,
      memberId: dad._id,
      name: 'สิทธิ์บัตรทอง',
      kind: 'สิทธิ์',
      meta: 'พ่อประสิทธิ์ · ใช้ได้ถึง 31 ธ.ค. 2568',
      expiresAt: new Date(2025, 11, 31),
      createdByMemberId: me._id
    },
    {
      householdId,
      memberId: null,
      name: 'ประกันสุขภาพกลุ่ม',
      kind: 'ประกัน',
      meta: 'กรมธรรม์ 4482-119',
      referenceNumber: '4482-119',
      createdByMemberId: me._id
    },
    {
      householdId,
      memberId: null,
      name: 'ใบรับรองแพทย์',
      kind: 'PDF',
      meta: 'ออก 4 ส.ค. 2568 · หมอพงศ์',
      issuedAt: new Date(2025, 7, 4),
      createdByMemberId: me._id
    }
  ])
  log('  documents: 4')

  // --- Expenses (design screen 11) -------------------------------------
  // The design shows one total and three category slices — 4,280 บาท across
  // 6 รายการ (ค่ายา 620 · ค่าตรวจอายุรกรรม 1,900 · ค่าเดินทาง 1,760). The
  // per-item split within each category isn't given, so it's divided into the
  // six line items the count calls for while keeping every category total and
  // the grand total exact.
  await Expense.insertMany([
    {
      householdId,
      memberId: dad._id,
      title: 'ค่ายา Amlodipine 5 mg',
      category: 'medicine',
      amount: 320,
      spentAt: at(-12, 10, 0),
      createdByMemberId: me._id
    },
    {
      householdId,
      memberId: me._id,
      title: 'ค่ายา Metformin 500 mg',
      category: 'medicine',
      amount: 300,
      spentAt: at(-9, 10, 0),
      createdByMemberId: me._id
    },
    {
      householdId,
      memberId: dad._id,
      title: 'ค่าตรวจอายุรกรรม',
      category: 'treatment',
      amount: 1200,
      spentAt: at(-8, 9, 0),
      createdByMemberId: me._id
    },
    {
      householdId,
      memberId: mom._id,
      title: 'ค่าตรวจเลือดและผลแล็บ',
      category: 'treatment',
      amount: 700,
      spentAt: at(-6, 9, 0),
      createdByMemberId: me._id
    },
    {
      householdId,
      memberId: dad._id,
      title: 'ค่าเดินทางไปโรงพยาบาล',
      category: 'transport',
      amount: 880,
      spentAt: at(-8, 7, 30),
      createdByMemberId: me._id
    },
    {
      householdId,
      memberId: mom._id,
      title: 'ค่าเดินทางไปโรงพยาบาล',
      category: 'transport',
      amount: 880,
      spentAt: at(-6, 7, 30),
      createdByMemberId: me._id
    }
  ])
  log('  expenses: 6 รายการ · 4,280 บาท')

  // --- Timeline (design screens 09 + 14) -------------------------------
  await TimelineEvent.insertMany([
    {
      householdId,
      actorMemberId: me._id,
      relatedMemberId: mom._id,
      type: 'medication',
      title: 'ยืนยันการทานยาพร้อมรูป',
      detail: 'แม่สมใจ · Simvastatin 10 mg',
      occurredAt: at(0, 8, 32)
    },
    {
      householdId,
      actorMemberId: mom._id,
      relatedMemberId: mom._id,
      type: 'check-in',
      title: 'Check-in สำเร็จ',
      detail: 'แม่สมใจยืนยันว่าปกติดี',
      occurredAt: at(0, 8, 32)
    },
    {
      householdId,
      actorMemberId: me._id,
      relatedMemberId: dad._id,
      type: 'appointment',
      title: 'นัดตรวจพรุ่งนี้ 08:00',
      detail: 'โรงพยาบาลกรุงเทพ · หมอพงศ์',
      occurredAt: at(0, 10, 20)
    },
    {
      householdId,
      actorMemberId: me._id,
      relatedMemberId: brother._id,
      type: 'task',
      title: 'พี่เกษมรับผิดชอบพาไป',
      detail: 'มอบหมายงานในครอบครัวแล้ว',
      occurredAt: at(-1, 16, 5)
    }
  ])
  log('  timeline events: 4')

  return household
}

const seedPartnerHousehold = async () => {
  const household = await resetHousehold({
    name: 'บ้านแฟน',
    kind: 'partner',
    inviteCode: PARTNER_INVITE_CODE
  })
  const householdId = household._id

  // The handoff specifies this group's name, kind and headcount (3 คน) but
  // names none of its members, so the two profiles below carry relation-only
  // labels rather than invented personal names. Flagged in the summary.
  const me = await HouseholdMember.create({
    householdId,
    userId: OWNER_USER_ID,
    role: 'owner',
    displayName: 'aef',
    relation: 'ตัวฉันเอง',
    status: 'normal',
    detail: 'ดูแลร่วมกับครอบครัวแฟน',
    isDefault: false
  })

  const partnerMother = await HouseholdMember.create({
    householdId,
    userId: null,
    role: 'elder',
    displayName: 'แม่ของแฟน',
    relation: 'แม่ของแฟน',
    status: 'normal',
    detail: 'ยังไม่มีรายการยาวันนี้',
    createdByMemberId: me._id
  })

  await HouseholdMember.create({
    householdId,
    userId: null,
    role: 'elder',
    displayName: 'พ่อของแฟน',
    relation: 'พ่อของแฟน',
    status: 'normal',
    detail: 'ยังไม่มีรายการยาวันนี้',
    createdByMemberId: me._id
  })

  await Message.create({
    householdId,
    senderMemberId: me._id,
    senderUserId: OWNER_USER_ID,
    text: 'สวัสดีครับ เริ่มใช้กลุ่มบ้านนี้สำหรับดูแลคุณพ่อคุณแม่ของแฟนนะครับ',
    createdAt: at(0, 9, 5),
    updatedAt: at(0, 9, 5)
  })

  log(`  members: 3 · messages: 1 · (elder: ${partnerMother.displayName})`)

  return household
}

// Whichever household the design marks default, exactly one membership per
// user may carry the flag — clear it anywhere else this account is a member,
// including the pre-existing "Sopa".
const enforceSingleDefault = async (defaultHouseholdId) => {
  await HouseholdMember.updateMany(
    { userId: OWNER_USER_ID, householdId: { $ne: defaultHouseholdId } },
    { isDefault: false }
  )
}

const run = async () => {
  // Reads .env from the current working directory, same as server.js — run
  // this from the project root.
  loadEnv()
  await connectDatabase()

  log('\nSeeding "Parent Care v3" design mock data')
  log(`owner user: ${OWNER_USER_ID}\n`)

  log('บ้านพ่อแม่ (parents, default)')
  const parents = await seedParentsHousehold()

  log('\nบ้านแฟน (partner)')
  await seedPartnerHousehold()

  await enforceSingleDefault(parents._id)

  log('\nDone. Households left untouched: every one this script did not create.')
  await mongoose.connection.close()
}

run().catch(async (error) => {
  console.error('\nSeed failed:', error)
  await mongoose.connection.close().catch(() => {})
  process.exit(1)
})
