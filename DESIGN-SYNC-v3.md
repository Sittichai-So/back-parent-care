# Backend sync — Parent Care v3 design handoff

Brings the backend in line with the `design-handoff/parent-care-v3` bundle and the
frontend at `C:\Users\Acer\parent_care\parent_care`. Every schema change is
**additive** — nothing was renamed, removed, or repurposed.

Where the handoff and the frontend code disagreed, the frontend code won, as
instructed. Those cases are listed under [Open questions](#open-questions).

---

## 1. What was actually missing

The frontend marks its own unbacked screens in comments, so the gaps were read
off the code rather than guessed:

| Design screen | Frontend marker | Before |
| --- | --- | --- |
| 08 ข้อความครอบครัว | `messages.tsx:22` — "no messaging backend… nothing persisted" | nothing |
| 10 บันทึกส่งต่อเวร | `profile.tsx:42` — "no handoff-notes storage" | nothing |
| 10 เอกสารและสิทธิ์ | `profile.tsx:50` — "this app has no document storage" | nothing |
| 11 ค่าใช้จ่ายเดือนนี้ | `owner-report.tsx:41` — "no expense-tracking feature" | nothing |
| 06 ยืนยันด้วยรูป | `medication-confirm.tsx:57` — "no camera/upload integration" | `MedicationLog.image` already existed; only the shot time was missing |
| 05 ชีพจร tile | — | `Vital` had systolic/diastolic/sugar/weight but no pulse |
| Group switcher | `household-switcher.tsx:22` — "the server has none" | `Household` had no kind, no default flag |

Everything else the design shows — members, statuses, medicines, appointments,
vitals, tasks, timeline, emergency — was already backed and already matched the
shapes in `src/services/*.ts`. It was left alone.

---

## 2. Dependencies added

| Package | Version | Scope | Why |
| --- | --- | --- | --- |
| `socket.io` | ^4.8.3 | dependency | realtime family chat |
| `socket.io-client` | ^4.8.3 | devDependency | used only by `scripts/test-design-sync.js` |

The frontend still needs `socket.io-client` added on its side — not done here.

---

## 3. Schema changes

### Fields added to existing models

| Model | Field | Type | Purpose |
| --- | --- | --- | --- |
| `Household` | `kind` | `enum('parents','partner','relatives','other')`, default `'other'` | the group pill's icon and its `"<label> · <n> คน"` meta line |
| `HouseholdMember` | `isDefault` | `Boolean`, default `false` | the "กลุ่มเริ่มต้น" toggle |
| `MedicationLog` | `photoTakenAt` | `Date`, default `null` | "เวลาถ่ายภาพ", distinct from `takenAt` ("ยืนยันแล้ว HH:MM") |
| `Vital` | `pulse` | `Number`, default `null` | the ชีพจร tile on member detail |
| `Message` | `senderUserId` | nullable | see [note](#why-senderuserid-is-nullable) |

`isDefault` lives on the **membership**, not on `Household`, because "which group
opens on sign-in" is a per-user choice — two people in one household can each
have a different default. `household.service.js#setDefaultHousehold` keeps at
most one true per user.

`Vital.pulse` also widened `validateReadings` in `vital.service.js`: a pulse-only
reading is now valid, where before at least one of BP/sugar/weight was required.

### New models

| Model | Collection | Backs |
| --- | --- | --- |
| `Message` | `messages` | screen 08, family chat |
| `HandoffNote` | `handoffnotes` | screen 10, บันทึกส่งต่อเวร |
| `Document` | `documents` | screen 10, เอกสารและสิทธิ์ |
| `Expense` | `expenses` | screen 11, ค่าใช้จ่ายเดือนนี้ |

Each follows the existing module layout
(`model` / `repository` / `service` / `controller` / `routes` / `schema` / `index`).

**`Document`** stores `kind` as the Thai label the design's pill renders
(`ID` · `สิทธิ์` · `ประกัน` · `PDF`) and `meta` as the grey line verbatim, because
the frontend prints both straight through. `referenceNumber` / `issuedAt` /
`expiresAt` carry the same facts structurally for anything that needs to sort or
expire on them.

**`Expense`** stores `category` as a slug (`medicine` · `treatment` · `transport` ·
`other`) because those values get grouped and summed — the Thai labels come back
from the summary endpoint instead.

### Schema files updated

- `scripts/init-db.js` — validators + indexes for the four new collections, plus
  the new fields on `households`, `householdmembers`, `medicationlogs`, `vitals`.
- `scripts/migrate-design-sync.js` — **new**, backfills `kind` and `isDefault` on
  rows written before those fields existed. A Mongoose default only applies to
  documents Mongoose writes; it never rewrites existing rows, so without this an
  older household comes back with `kind` absent rather than `'other'`.
  Deliberately does *not* backfill `photoTakenAt` or `pulse` — absent correctly
  means "never recorded" there.

---

## 4. REST endpoints

All nested endpoints sit behind `authMiddleware` → `householdMiddleware`, same as
everything else under `/api/households/:householdId/`.

### New

| Method | Path | Roles | Notes |
| --- | --- | --- | --- |
| `GET` | `/households/:id/messages` | all members | `?limit=` (default 50, capped 200), `?before=` cursor. Returns **oldest-first** so bubbles stack top-to-bottom. Sender populated. |
| `POST` | `/households/:id/messages` | owner, caregiver, elder | also broadcasts `receive_message` |
| `DELETE` | `/households/:id/messages/:messageId` | own message, or owner/caregiver | soft delete |
| `GET` | `/households/:id/handoff-notes` | all members | newest-first, author populated |
| `POST` | `/households/:id/handoff-notes` | owner, caregiver, elder | also records a timeline event |
| `DELETE` | `/households/:id/handoff-notes/:noteId` | own note, or owner/caregiver | |
| `GET` | `/households/:id/documents` | all members | `?memberId=`, `?kind=` |
| `POST` `PUT` `DELETE` | `/households/:id/documents[/:documentId]` | owner, caregiver | |
| `GET` | `/households/:id/expenses` | all members | `?memberId=`, `?category=`, `?month=YYYY-MM` |
| `GET` | `/households/:id/expenses/summary` | all members | `?month=YYYY-MM`, defaults to this month |
| `POST` `PUT` `DELETE` | `/households/:id/expenses[/:expenseId]` | owner, caregiver | |
| `POST` | `/households/:id/set-default` | any member | sets the caller's "กลุ่มเริ่มต้น"; no body |

`GET /expenses/summary` returns exactly what the dashboard card needs:

```json
{
  "month": "2026-08",
  "total": 4280,
  "count": 6,
  "categories": [
    { "category": "treatment", "label": "ค่าตรวจอายุรกรรม", "amount": 1900, "count": 2, "pct": 44 },
    { "category": "transport", "label": "ค่าเดินทางโรงพยาบาล", "amount": 1760, "count": 2, "pct": 41 },
    { "category": "medicine",  "label": "ค่ายา",              "amount": 620,  "count": 2, "pct": 15 }
  ]
}
```

`pct` is rounded and the largest slice absorbs the drift, so the parts always sum
to exactly 100 and the stacked bar never leaves a sliver of background.

### Changed (backwards compatible)

| Endpoint | Change |
| --- | --- |
| `POST /households` | accepts optional `kind`; the account's **first** household now becomes its default automatically |
| `PATCH /households/:id` | now accepts `kind`; `name` is no longer required on its own — the body must carry `name` **or** `kind` (`.or('name','kind')`) |
| `POST /households/:id/medicines/:medicineId/logs` | accepts `photoTakenAt` |
| `POST` / `PUT` vitals | accept `pulse`; a pulse-only reading is now valid |

No existing request shape was invalidated.

---

## 5. Socket.IO

Attached to the **same** HTTP server Express listens on — one port, one process.
`server.js` now wraps the app in an explicit `http.createServer(app)` purely so
the socket server can share it. Path: `/socket.io`.

### Authentication

Same JWT as the REST API, verified **once during the handshake**, so an
unauthenticated socket never connects at all. The token is read from
`handshake.auth.token`, then `Authorization: Bearer …`, then `?token=`.

A valid token proves *who* you are, not *which* households you may read — so
`join_family_room` re-checks `HouseholdMember` with the same rules
`householdMiddleware` applies (active, and not a still-pending invite). Every
subsequent event is checked against the rooms that socket was actually cleared
for, so a client can't act on a household id it merely guessed.

### Events

**Client → server** (all take an optional ack callback):

| Event | Payload | Ack |
| --- | --- | --- |
| `join_family_room` | `{ householdId }` | `{ ok, householdId, membershipId, role }` |
| `leave_family_room` | `{ householdId }` | `{ ok }` |
| `send_message` | `{ householdId, text }` | `{ ok, message }` |
| `typing` | `{ householdId }` | — |
| `stop_typing` | `{ householdId }` | — |

**Server → client:**

| Event | Payload |
| --- | --- |
| `receive_message` | the full message, sender populated |
| `message_deleted` | `{ _id, householdId }` |
| `member_joined` | `{ householdId, memberId, displayName }` |
| `typing` / `stop_typing` | `{ householdId, memberId, displayName }` |

Room naming is `household:<id>` — one room per household, since the design has a
single family conversation per บ้าน with no sub-channels.

### The two transports share one path

`POST /messages` and the socket's `send_message` both call
`message.service.js#sendMessage`, which persists **and** broadcasts. A message
sent over HTTP reaches live socket clients, and a socket-sent message is in the
REST history immediately. The test suite asserts both directions, so the two can't
quietly diverge.

Viewers are blocked in the service, not only in route middleware, precisely
because the socket path never passes through Express.

### Why `senderUserId` is nullable

`HouseholdMember.userId` is already nullable — the app supports member profiles
with no linked account (an elder with no phone). Such a profile can be the
attributed sender of a message recorded on their behalf, which is how the seeded
conversation has three different speakers under one account. Anything arriving
over the socket or REST always has a `senderUserId`, because both paths require
an authenticated caller.

---

## 6. Mock data

Seeded by `npm run seed:design` (`scripts/seed-design-mock.js`).

**No new `User` rows are created.** Everything hangs off the existing account:

```
_id:      6a7aeafd509241c02a11b603
name:     aef
email:    aef.35595@gmail.com
userCode: UCB3SDU7
```

The other family members are **managed member profiles** (`HouseholdMember` with
`userId: null`) — the same shape the app's own `createManagedMember` produces.

The account's pre-existing household **`Sopa` was left completely untouched.**

### Households created

| Name | kind | Members | Default |
| --- | --- | --- | --- |
| บ้านพ่อแม่ | `parents` | 4 | ✅ |
| บ้านแฟน | `partner` | 3 | — |

### บ้านพ่อแม่ contents

- **Members** — aef (owner) · พ่อประสิทธิ์ (elder, `monitor`) · แม่สมใจ (elder) · พี่เกษม
- **Medicines** — Metformin 500 mg 13:00 (aef) · Amlodipine 5 mg 12:00 (พ่อ) ·
  Simvastatin 10 mg 20:00 (แม่)
- **Medication log** — แม่สมใจ's dose only: photo shot 08:30, confirmed 08:32,
  matching the design's seeded `done` state. This is what makes
  `Medicine.lastTakenAt` come back non-null for her (it's derived from the log,
  never stored).
- **Appointments** — 5, per the design's calendar
- **Vitals** — 128/82 + ชีพจร 74 @ 08:40, น้ำตาล 102 @ 07:10 (two records, because
  the design's tiles carry two different times)
- **Tasks** — เช็กอินประจำวัน (done) · พาไปนัดตรวจสุขภาพ (in-progress)
- **Messages** — the design's 3 chat lines, at 07:58 / 08:33 / 10:22
- **Handoff notes** — the design's 2, both by พี่เกษม
- **Documents** — the design's 4 (บัตรประชาชน · สิทธิ์บัตรทอง · ประกันสุขภาพกลุ่ม · ใบรับรองแพทย์)
- **Expenses** — 6 รายการ, 4,280 บาท (ค่ายา 620 · ค่าตรวจอายุรกรรม 1,900 · ค่าเดินทาง 1,760)
- **Timeline** — the design's 4 notice/audit entries

The script is **idempotent**: the two households are looked up by
`(ownerUserId, name)` and every child record beneath them is rebuilt on each run.
Households it didn't create are never touched.

### Dates are relative, not literal

The handoff pins its calendar to 25–30 April, which is only meaningful relative to
"today" — the 25th carries a "พรุ่งนี้" tag. Seeding those literal dates would put
every appointment in the past and hide them from a frontend that filters to
upcoming ones. The same relative offsets are anchored to the day the seed runs:
day 25 → tomorrow, 26 → +2, 28 → +4, 29 → +5, 30 → +6.

---

## 7. Verification

`npm run test:design` (`scripts/test-design-sync.js`) — requires the server
running and the seed applied. It signs its own JWT from `JWT_SECRET`, so it
doesn't need the account's password.

**51 passed, 0 failed.** Covers:

- `kind` / `isDefault` come back correctly on `/households/mine`
- all four seeded members, with พ่อประสิทธิ์ at `monitor`
- `lastTakenAt` derived from the log; `photoTakenAt` present and earlier than `takenAt`
- `pulse` round-trips alongside blood pressure
- handoff-notes / documents / expenses list correctly with populated refs
- expense summary: total 4280, count 6, percentages summing to exactly 100, Thai labels
- message history returns oldest-first with the sender populated
- **a socket with a bad token, and one with no token, are both refused**
- connect → join → send → receive across two sockets
- joining a household you're not a member of is refused
- an empty message is refused
- a REST-sent message reaches live socket clients
- `typing` is broadcast to the room but not echoed to the sender
- both socket-sent and REST-sent messages are persisted

### Commands

```bash
mongosh "<MONGODB_URI>" scripts/init-db.js   # collections, validators, indexes
npm run migrate:design                       # backfill kind / isDefault
npm run seed:design                          # design mock data
npm run dev                                  # server + socket on PORT (8024)
npm run test:design                          # 51 assertions
```

---

## Open questions

Things the design didn't settle, or where it conflicts with the code. Each was
resolved the least-inventive way available and flagged rather than assumed.

### Needs a decision

1. **พี่เกษม's role.** The design's members-and-access screen casts him as a
   **Caregiver** with his own login (`kasem@gmail.com`). Creating that user was
   explicitly out of scope, and the app rejects owner/caregiver for an
   account-less profile anyway — those roles need someone who can sign in and act
   for themself. He is seeded as a **viewer-level managed profile**. To match the
   design he needs either a real account (self-register, then invite + accept) or
   a relaxation of that rule.

2. **บ้านแฟน's members.** The handoff gives this group a name, a kind and a
   headcount (3 คน) but names nobody. The two profiles carry relation-only labels
   (`แม่ของแฟน`, `พ่อของแฟน`) rather than invented personal names. Real names
   welcome.

3. **Who each appointment is for.** The handoff names the escort ("ผู้พา") for
   every visit but the patient only for the one marked "ของฉัน". `memberId` was
   inferred from context and the escort preserved verbatim in `notes`. Worth a
   confirm — or the design could state the patient per row.

4. **`Document.kind` is stored as the Thai display label** (`ID` · `สิทธิ์` ·
   `ประกัน` · `PDF`) because the frontend prints it straight into the pill. If the
   frontend would rather map slugs to labels itself, say so and this becomes a
   slug enum like `Expense.category`.

5. **Per-item expense split.** The design gives three category totals and a count
   of 6 but not the individual line items. They were split into six rows that keep
   every category total and the grand total exact.

### Frontend work this unblocks

6. `HouseholdSummary` in `family-context.tsx` has no `kind` or `isDefault` —
   both are now on the wire but unmapped, so `household-switcher.tsx` still shows
   a generic `HouseIcon` and no default toggle. `POST /households/:id/set-default`
   is ready when the switcher wants it.

7. `messages.tsx`, `profile.tsx` (handoff notes + documents) and
   `owner-report.tsx` (spend) are still on local `useState` with
   "ตัวอย่างดีไซน์" banners. The endpoints behind all four now exist. The chat
   also needs `socket.io-client` on the frontend.

8. `medication-confirm.tsx` still simulates the camera. `MedicationLog.image` and
   `photoTakenAt` are both accepted, and `POST /api/uploads` already exists — the
   remaining work is `expo-camera` / `expo-image-picker` plus passing the URL
   through `logDose`, which currently sends only `status`.

### Deliberately not changed

9. **Notices.** `notices.tsx` derives its feed client-side from member status,
   pending invites and upcoming appointments. A `Notification` model exists
   server-side and is unused by the frontend. Left as-is — outside the design gaps
   above, and the frontend's approach works.

10. **The pre-trip checklist** on `calendar.tsx` stays local-only. The handoff
    itself says checklist rows are "optimistic local state", so no per-appointment
    checklist field was added.

11. **Elder logins.** พ่อประสิทธิ์ and แม่สมใจ are account-less profiles and so
    cannot sign in, while the design's Elder role (`elder@gmail.com`) assumes a
    login. Same constraint as (1) — no new users were created.
