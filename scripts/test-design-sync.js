/**
 * End-to-end smoke test for the design-sync work: the new REST endpoints and
 * the Socket.IO family chat.
 *
 * Usage: node scripts/test-design-sync.js            (defaults to PORT from .env)
 *        BASE_PORT=8025 node scripts/test-design-sync.js
 *
 * Requires the server to be running and scripts/seed-design-mock.js to have
 * been run. Signs its own JWT with JWT_SECRET rather than logging in, so it
 * doesn't need the seeded account's password.
 */

const { io } = require('socket.io-client')
const { loadEnv } = require('../src/config/env')
const { signToken } = require('../src/utils/jwt')

loadEnv()

const PORT = process.env.BASE_PORT || process.env.PORT || 3000
const BASE = `http://localhost:${PORT}`
const API = `${BASE}/api`

const OWNER_USER_ID = '6a7aeafd509241c02a11b603'
const OWNER_EMAIL = 'aef.35595@gmail.com'

let passed = 0
let failed = 0

const check = (label, condition, detail = '') => {
  if (condition) {
    passed += 1
    console.log(`  PASS  ${label}`)
  } else {
    failed += 1
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`)
  }
}

const apiGet = async (token, path) => {
  const response = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } })
  return { status: response.status, body: await response.json() }
}

const apiPost = async (token, path, body) => {
  const response = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  return { status: response.status, body: await response.json() }
}

const connectSocket = (token) =>
  new Promise((resolve, reject) => {
    const socket = io(BASE, { auth: { token }, transports: ['websocket'], reconnection: false })
    socket.on('connect', () => resolve(socket))
    socket.on('connect_error', (error) => reject(error))
    setTimeout(() => reject(new Error('socket connect timed out')), 5000)
  })

const emitAck = (socket, event, payload) =>
  new Promise((resolve) => {
    socket.emit(event, payload, resolve)
    setTimeout(() => resolve({ ok: false, error: 'ack timed out' }), 5000)
  })

const run = async () => {
  const token = signToken({ id: OWNER_USER_ID, email: OWNER_EMAIL })

  console.log(`\nTesting against ${BASE}\n`)

  // --- households -------------------------------------------------------
  console.log('households')
  const households = await apiGet(token, '/households/mine')
  check('GET /households/mine returns 200', households.status === 200, `got ${households.status}`)

  const rows = households.body.data || []
  const parents = rows.find((row) => row.household.name === 'บ้านพ่อแม่')
  const partner = rows.find((row) => row.household.name === 'บ้านแฟน')

  check('บ้านพ่อแม่ is present', Boolean(parents))
  check('บ้านแฟน is present', Boolean(partner))
  check('บ้านพ่อแม่ has kind=parents', parents?.household.kind === 'parents', `got ${parents?.household.kind}`)
  check('บ้านแฟน has kind=partner', partner?.household.kind === 'partner', `got ${partner?.household.kind}`)
  check('บ้านพ่อแม่ is the default group', parents?.membership.isDefault === true)
  check('บ้านแฟน is not the default group', partner?.membership.isDefault === false)

  if (!parents) {
    console.log('\nCannot continue without the seeded household — run scripts/seed-design-mock.js first.')
    process.exit(1)
  }

  const householdId = parents.household._id

  // --- members ----------------------------------------------------------
  console.log('\nmembers')
  const members = await apiGet(token, `/households/${householdId}/members`)
  const names = (members.body.data || []).map((member) => member.displayName)
  check('4 members', (members.body.data || []).length === 4, `got ${(members.body.data || []).length}`)
  check('design members present', ['aef', 'พ่อประสิทธิ์', 'แม่สมใจ', 'พี่เกษม'].every((n) => names.includes(n)), names.join(', '))
  const dad = (members.body.data || []).find((member) => member.displayName === 'พ่อประสิทธิ์')
  check('พ่อประสิทธิ์ needs attention (monitor)', dad?.status === 'monitor', `got ${dad?.status}`)

  // --- medicines + photo confirmation ------------------------------------
  console.log('\nmedicines')
  const medicines = await apiGet(token, `/households/${householdId}/medicines`)
  const mom = (medicines.body.data || []).find((medicine) => medicine.name === 'Simvastatin')
  check('3 medicines', (medicines.body.data || []).length === 3, `got ${(medicines.body.data || []).length}`)
  check('Simvastatin has lastTakenAt (confirmed today)', Boolean(mom?.lastTakenAt))

  const logs = await apiGet(token, `/households/${householdId}/medication-logs`)
  const withPhotoTime = (logs.body.data || []).find((entry) => entry.photoTakenAt)
  check('medication log carries photoTakenAt', Boolean(withPhotoTime))
  check(
    'photoTakenAt precedes takenAt',
    withPhotoTime && new Date(withPhotoTime.photoTakenAt) < new Date(withPhotoTime.takenAt)
  )

  // --- vitals -----------------------------------------------------------
  console.log('\nvitals')
  const vitals = await apiGet(token, `/households/${householdId}/vitals`)
  const bp = (vitals.body.data || []).find((vital) => vital.systolic === 128)
  check('blood pressure 128/82 seeded', bp?.diastolic === 82)
  check('pulse 74 seeded on the same reading', bp?.pulse === 74, `got ${bp?.pulse}`)
  check('sugar 102 seeded', (vitals.body.data || []).some((vital) => vital.sugar === 102))

  // --- new endpoints ----------------------------------------------------
  console.log('\nhandoff notes / documents / expenses')
  const notes = await apiGet(token, `/households/${householdId}/handoff-notes`)
  check('GET handoff-notes returns 200', notes.status === 200, `got ${notes.status}`)
  check('2 handoff notes', (notes.body.data || []).length === 2)
  check('handoff note author is populated', Boolean((notes.body.data || [])[0]?.authorMemberId?.displayName))

  const documents = await apiGet(token, `/households/${householdId}/documents`)
  check('GET documents returns 200', documents.status === 200, `got ${documents.status}`)
  check('4 documents', (documents.body.data || []).length === 4)
  const kinds = (documents.body.data || []).map((doc) => doc.kind).sort()
  check('all four design kinds present', JSON.stringify(kinds) === JSON.stringify(['ID', 'PDF', 'ประกัน', 'สิทธิ์'].sort()), kinds.join(','))

  const expenses = await apiGet(token, `/households/${householdId}/expenses`)
  check('6 expense rows', (expenses.body.data || []).length === 6)

  const summary = await apiGet(token, `/households/${householdId}/expenses/summary`)
  check('GET expenses/summary returns 200', summary.status === 200, `got ${summary.status}`)
  check('summary total is 4280', summary.body.data?.total === 4280, `got ${summary.body.data?.total}`)
  check('summary count is 6', summary.body.data?.count === 6, `got ${summary.body.data?.count}`)
  const pctSum = (summary.body.data?.categories || []).reduce((sum, row) => sum + row.pct, 0)
  check('category percentages add to 100', pctSum === 100, `got ${pctSum}`)
  const treatment = (summary.body.data?.categories || []).find((row) => row.category === 'treatment')
  check('ค่าตรวจอายุรกรรม is 1900', treatment?.amount === 1900, `got ${treatment?.amount}`)
  check('category carries its Thai label', treatment?.label === 'ค่าตรวจอายุรกรรม', `got ${treatment?.label}`)

  // --- chat over REST ---------------------------------------------------
  console.log('\nmessages (REST)')
  const history = await apiGet(token, `/households/${householdId}/messages`)
  check('GET messages returns 200', history.status === 200, `got ${history.status}`)
  const seeded = history.body.data || []
  check('3 seeded messages', seeded.length === 3, `got ${seeded.length}`)
  check('sender is populated', Boolean(seeded[0]?.senderMemberId?.displayName))
  check(
    'history is oldest-first',
    seeded.length === 3 && new Date(seeded[0].createdAt) < new Date(seeded[2].createdAt)
  )

  // --- socket auth ------------------------------------------------------
  console.log('\nsocket auth')
  let rejected = false
  try {
    await connectSocket('not-a-real-token')
  } catch (error) {
    rejected = true
  }
  check('a socket with a bad token is refused', rejected)

  let noTokenRejected = false
  try {
    await connectSocket(undefined)
  } catch (error) {
    noTokenRejected = true
  }
  check('a socket with no token is refused', noTokenRejected)

  // --- socket chat ------------------------------------------------------
  console.log('\nsocket chat (connect → join → send → receive)')
  const sender = await connectSocket(token)
  const listener = await connectSocket(token)
  check('two authenticated sockets connected', sender.connected && listener.connected)

  const senderJoin = await emitAck(sender, 'join_family_room', { householdId })
  const listenerJoin = await emitAck(listener, 'join_family_room', { householdId })
  check('sender joined the family room', senderJoin.ok === true, senderJoin.error)
  check('listener joined the family room', listenerJoin.ok === true, listenerJoin.error)
  check('join returns the membership id', Boolean(senderJoin.membershipId))

  const refused = await emitAck(sender, 'join_family_room', { householdId: '000000000000000000000000' })
  check('joining a household you are not in is refused', refused.ok === false)

  const text = `ทดสอบข้อความเรียลไทม์ ${Date.now()}`
  const received = new Promise((resolve) => {
    listener.on('receive_message', resolve)
    setTimeout(() => resolve(null), 5000)
  })

  const sendAck = await emitAck(sender, 'send_message', { householdId, text })
  check('send_message acknowledged', sendAck.ok === true, sendAck.error)

  const broadcast = await received
  check('the other socket received the broadcast', Boolean(broadcast))
  check('the broadcast carries the same text', broadcast?.text === text)
  check('the broadcast has a populated sender', Boolean(broadcast?.senderMemberId?.displayName))

  const emptyAck = await emitAck(sender, 'send_message', { householdId, text: '   ' })
  check('an empty message is refused', emptyAck.ok === false)

  // A message sent over REST must reach live sockets too — the two transports
  // share one service, and this is what proves they haven't diverged.
  const restText = `ทดสอบข้อความจาก REST ${Date.now()}`
  const receivedFromRest = new Promise((resolve) => {
    listener.on('receive_message', (message) => {
      if (message.text === restText) resolve(message)
    })
    setTimeout(() => resolve(null), 5000)
  })
  const restSend = await apiPost(token, `/households/${householdId}/messages`, { text: restText })
  check('POST /messages returns 201', restSend.status === 201, `got ${restSend.status}`)
  check('a REST-sent message reaches socket clients', Boolean(await receivedFromRest))

  // --- typing indicator -------------------------------------------------
  const typingSeen = new Promise((resolve) => {
    listener.on('typing', resolve)
    setTimeout(() => resolve(null), 3000)
  })
  sender.emit('typing', { householdId })
  check('typing is broadcast to the room', Boolean(await typingSeen))

  // --- persistence ------------------------------------------------------
  const after = await apiGet(token, `/households/${householdId}/messages`)
  const texts = (after.body.data || []).map((message) => message.text)
  check('the socket-sent message was persisted', texts.includes(text))
  check('the REST-sent message was persisted', texts.includes(restText))

  sender.close()
  listener.close()

  console.log(`\n${passed} passed, ${failed} failed\n`)
  process.exit(failed === 0 ? 0 : 1)
}

run().catch((error) => {
  console.error('\nTest run crashed:', error)
  process.exit(1)
})
