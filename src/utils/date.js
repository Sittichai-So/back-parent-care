const pad = (n) => String(n).padStart(2, '0')

// Local-calendar-day key ("YYYY-MM-DD"), not UTC — matches how the frontend
// keys a day (utils/date.ts#formatDateKey) so a reminder logged just after
// midnight local time doesn't get attributed to the wrong day.
const todayKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

module.exports = { todayKey }
