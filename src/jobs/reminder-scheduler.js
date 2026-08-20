const medicineRepository = require('../modules/medicine/medicine.repository')
const medicationLogRepository = require('../modules/medication-log/medication-log.repository')
const appointmentRepository = require('../modules/appointment/appointment.repository')
const householdMemberRepository = require('../modules/household/household-member.repository')
const notificationRepository = require('../modules/notification/notification.repository')
const { todayKey } = require('../utils/date')

/**
 * In-app reminders for medicine/appointment times as they're reached —
 * distinct from (and does not depend on) the frontend's OS-level local
 * notifications, which Expo Go on Android can't schedule at all (see
 * services/notifications.ts on the frontend). This writes to the same
 * Notification inbox the "การแจ้งเตือน" screen and emergency alerts already
 * use, so it shows up there regardless of platform/build.
 *
 * Runs on a plain interval rather than a cron library — no other scheduled
 * job exists in this app yet, so one more dependency for a single 5-minute
 * tick isn't worth it.
 */
const POLL_INTERVAL_MS = 5 * 60 * 1000

// Once a medicine's dose is overdue and still unconfirmed, it re-notifies
// hourly (not just once) — a single ping is easy to miss or forget, and this
// is exactly the kind of thing a caregiver wants to know about. Appointments
// don't get this: there's no "confirmed attended" state to check against,
// only a one-time "it's happening now" ping (see checkAppointmentReminders).
const REPEAT_INTERVAL_MS = 60 * 60 * 1000

// A time "just became due" if it fell inside the window since the last tick
// — this is what keeps each due moment notified exactly once (per the
// duplicate-guard below) instead of every tick for the rest of the day, and
// is also why a time that was already due *before this feature shipped*
// never fires: `elapsed` is already far outside the window the first time
// this ever runs for it.
const isJustDue = (scheduledAt, now) => {
  const elapsed = now.getTime() - scheduledAt.getTime()
  return elapsed >= 0 && elapsed < POLL_INTERVAL_MS
}

// Same "just crossed the line" idea as isJustDue, but repeated at every
// hourly checkpoint since `scheduledAt` (0h, 1h, 2h, ...) instead of only
// the first one — this is what turns a single on-time reminder into hourly
// escalation for as long as the dose stays unconfirmed.
const isAttemptDue = (attemptDueAt, now) => {
  const elapsed = now.getTime() - attemptDueAt.getTime()
  return elapsed >= 0 && elapsed < POLL_INTERVAL_MS
}

const parseTimeOnDate = (time, date) => {
  const [hour, minute] = time.split(':').map(Number)
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null
  const result = new Date(date)
  result.setHours(hour, minute, 0, 0)
  return result
}

// The most recent occurrence of `time` that isn't in the future — today's,
// unless today's hasn't happened yet, in which case yesterday's. Needed
// because escalation windows can run well past midnight (e.g. an unconfirmed
// 20:00 dose still escalating hourly at 2am the next day): recomputing
// "today's 20:00" fresh on every poll tick would put it 18+ hours in the
// future once the calendar day has rolled over, silently breaking the chain
// right when it matters most (the last dose of the day going unconfirmed
// overnight).
const mostRecentOccurrence = (time, now) => {
  const today = parseTimeOnDate(time, now)
  if (!today) return null
  if (today > now) today.setDate(today.getDate() - 1)
  return today
}

const notifyHouseholdMembers = async (householdId, { type, title, message, data }) => {
  const members = await householdMemberRepository.findAll({ householdId, isActive: true })
  await Promise.all(
    members
      .filter((member) => member.userId)
      .map((member) =>
        notificationRepository.create({
          userId: member.userId,
          householdId,
          type,
          title,
          message,
          data
        })
      )
  )
}

const checkMedicineReminders = async (now) => {
  const medicines = await medicineRepository.findAll({ isActive: true })

  await Promise.all(
    medicines.map(async (medicine) => {
      // Sorted numerically (not lexicographically — "8:00" vs "13:00" would
      // otherwise sort wrong) since the escalation window below depends on
      // knowing each slot's true next slot.
      const times = [...new Set(medicine.times || [])]
        .filter((t) => /^\d{1,2}:\d{2}$/.test(t))
        .sort((a, b) => {
          const [ah, am] = a.split(':').map(Number)
          const [bh, bm] = b.split(':').map(Number)
          return ah * 60 + am - (bh * 60 + bm)
        })
      if (times.length === 0) return

      await Promise.all(
        times.map(async (time, index) => {
          const scheduledAt = mostRecentOccurrence(time, now)
          if (!scheduledAt) return

          // This slot's escalation window runs from its own scheduled time
          // up to (not including) the *next* slot's — later the same day as
          // `scheduledAt`, or that day's-plus-one first slot if this was the
          // last one — so an unconfirmed 8:00 dose stops nagging once the
          // 13:00 dose's own reminder cycle takes over, instead of the two
          // overlapping.
          const nextTime = times[index + 1] ?? times[0]
          const nextScheduledAt = parseTimeOnDate(nextTime, scheduledAt)
          if (!nextScheduledAt) return
          if (index === times.length - 1 || nextScheduledAt <= scheduledAt) {
            nextScheduledAt.setDate(nextScheduledAt.getDate() + 1)
          }

          if (now < scheduledAt || now >= nextScheduledAt) return

          // Which hourly attempt this tick falls on — 0 = on time, 1 = one
          // hour late, 2 = two hours late, etc. Cheap to compute, so this is
          // checked before either DB round-trip below.
          const elapsed = now.getTime() - scheduledAt.getTime()
          const attempt = Math.floor(elapsed / REPEAT_INTERVAL_MS)
          const attemptDueAt = new Date(scheduledAt.getTime() + attempt * REPEAT_INTERVAL_MS)
          if (!isAttemptDue(attemptDueAt, now)) return

          // Already confirmed for this slot (or a later one today) — the
          // data model only tracks the latest 'taken' log per medicine, not
          // per scheduled time, so "taken at/after this slot's time" is the
          // same granularity the frontend's own "ทานแล้ววันนี้" badge uses.
          // (Once this is true, no further attempts for this slot will fire
          // either — logDose also marks any already-sent ones read, see
          // medicine.service.js.)
          const lastTaken = await medicationLogRepository.findLatestTaken(medicine._id)
          if (lastTaken && lastTaken.takenAt >= scheduledAt) return

          // Keyed to the day the dose was actually *due* (scheduledAt), not
          // whatever day it happens to be when this tick runs — those can
          // differ once an escalation has crossed midnight.
          const day = todayKey(scheduledAt)
          const alreadyNotified = await notificationRepository.findOne({
            type: 'MEDICINE',
            'data.medicineId': String(medicine._id),
            'data.date': day,
            'data.time': time,
            'data.attempt': String(attempt)
          })
          if (alreadyNotified) return

          const title =
            attempt === 0
              ? `ถึงเวลาทานยา: ${medicine.name}`
              : `ยังไม่ได้ยืนยันการทานยา: ${medicine.name} (เลยเวลามาแล้ว ${attempt} ชม.)`

          await notifyHouseholdMembers(medicine.householdId, {
            type: 'MEDICINE',
            title,
            message: [medicine.dosage, `เวลา ${time} น.`].filter(Boolean).join(' · '),
            data: {
              medicineId: String(medicine._id),
              memberId: String(medicine.memberId),
              date: day,
              time,
              attempt: String(attempt)
            }
          })
        })
      )
    })
  )
}

const checkAppointmentReminders = async (now) => {
  const appointments = await appointmentRepository.findAll({ reminderEnabled: true })

  await Promise.all(
    appointments.map(async (appointment) => {
      const [year, month, day] = appointment.date.split('-').map(Number)
      const [hour, minute] = appointment.time.split(':').map(Number)
      if (!year || !month || !day || Number.isNaN(hour) || Number.isNaN(minute)) return

      const scheduledAt = new Date(year, month - 1, day, hour, minute, 0, 0)
      if (!isJustDue(scheduledAt, now)) return

      const alreadyNotified = await notificationRepository.findOne({
        type: 'APPOINTMENT',
        'data.appointmentId': String(appointment._id)
      })
      if (alreadyNotified) return

      await notifyHouseholdMembers(appointment.householdId, {
        type: 'APPOINTMENT',
        title: `ถึงเวลานัดหมาย: ${appointment.title}`,
        message: `${appointment.time} น. · ${appointment.hospital}`,
        data: { appointmentId: String(appointment._id), memberId: String(appointment.memberId) }
      })
    })
  )
}

const runReminderCheck = async () => {
  const now = new Date()
  // Each check runs independently — one failing (e.g. a bad schedule value
  // on one medicine) must never block the other from ever running again.
  try {
    await checkMedicineReminders(now)
  } catch (error) {
    console.error('Medicine reminder check failed', error)
  }
  try {
    await checkAppointmentReminders(now)
  } catch (error) {
    console.error('Appointment reminder check failed', error)
  }
}

let intervalHandle = null

const startReminderScheduler = () => {
  if (intervalHandle) return
  runReminderCheck()
  intervalHandle = setInterval(runReminderCheck, POLL_INTERVAL_MS)
}

const stopReminderScheduler = () => {
  if (intervalHandle) clearInterval(intervalHandle)
  intervalHandle = null
}

module.exports = { startReminderScheduler, stopReminderScheduler, runReminderCheck }
