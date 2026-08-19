const medicineRepository = require('../modules/medicine/medicine.repository')
const medicationLogRepository = require('../modules/medication-log/medication-log.repository')
const appointmentRepository = require('../modules/appointment/appointment.repository')
const householdMemberRepository = require('../modules/household/household-member.repository')
const notificationRepository = require('../modules/notification/notification.repository')

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

const pad = (n) => String(n).padStart(2, '0')
const todayKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

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
  const day = todayKey(now)

  await Promise.all(
    medicines.map(async (medicine) => {
      await Promise.all(
        (medicine.times || []).map(async (time) => {
          const [hour, minute] = time.split(':').map(Number)
          if (Number.isNaN(hour) || Number.isNaN(minute)) return

          const scheduledAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0)
          if (!isJustDue(scheduledAt, now)) return

          // Already confirmed for this slot (or a later one today) — the
          // data model only tracks the latest 'taken' log per medicine, not
          // per scheduled time, so "taken at/after this slot's time" is the
          // same granularity the frontend's own "ทานแล้ววันนี้" badge uses.
          const lastTaken = await medicationLogRepository.findLatestTaken(medicine._id)
          if (lastTaken && lastTaken.takenAt >= scheduledAt) return

          const alreadyNotified = await notificationRepository.findOne({
            type: 'MEDICINE',
            'data.medicineId': String(medicine._id),
            'data.date': day,
            'data.time': time
          })
          if (alreadyNotified) return

          await notifyHouseholdMembers(medicine.householdId, {
            type: 'MEDICINE',
            title: `ถึงเวลาทานยา: ${medicine.name}`,
            message: [medicine.dosage, `เวลา ${time} น.`].filter(Boolean).join(' · '),
            data: { medicineId: String(medicine._id), memberId: String(medicine.memberId), date: day, time }
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
