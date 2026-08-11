# แผนแก้ไข "หลังบ้าน" — เพิ่มสมาชิกแบบ 3 ทาง

**เป้าหมาย:** นอกจากเข้าร่วมกลุ่มด้วยรหัสเชิญ (มีอยู่แล้ว) ให้เพิ่มได้อีก 2 ทาง:
1. เพิ่มสมาชิกที่ **ไม่มีบัญชีของตัวเอง** (เช่น คุณตาคุณยายไม่มีโทรศัพท์) — ผู้ดูแลกรอกข้อมูลแทนได้เลย
2. **ค้นหาบัญชีที่มีอยู่แล้ว** (ด้วยอีเมล/รหัสประจำตัว ไม่ใช่ค้นหาชื่อแบบเปิด) แล้วส่งคำขอ — อีกฝ่ายต้องกดยอมรับก่อนถึงเป็นสมาชิกจริง (ป้องกันการเพิ่มคนโดยไม่ยินยอม + ป้องกันการไล่หาบัญชีคนอื่นในระบบ)

พร้อมทางออกในอนาคต: สมาชิกที่ไม่มีบัญชี (ทางที่ 1) ภายหลังอยากมีบัญชีเอง ก็ "ผูกบัญชี" เข้ากับโปรไฟล์เดิมได้ โดยไม่เสียประวัติยา/นัดหมาย/สุขภาพเดิม

---

## 1. เปลี่ยน Data Model

### `src/modules/household/household-member.model.js`
- เปลี่ยน `userId` จาก `required: true` → **optional/nullable** (สมาชิกไม่มีบัญชีได้)
- เปลี่ยน index `{ householdId: 1, userId: 1 }` จาก unique ธรรมดา → **unique แบบ partial** (`partialFilterExpression: { userId: { $type: 'objectId' } }`) เพื่อให้มีสมาชิก `userId: null` หลายคนในกลุ่มเดียวกันได้
- เพิ่มฟิลด์ใหม่:
  - `membershipState: { type: String, enum: ['active', 'pending'], default: 'active' }` — แยกจาก `status` เดิม (สถานะสุขภาพ normal/monitor/urgent) คนละความหมายกัน ห้ามใช้ฟิลด์เดียวกัน
  - `createdByMemberId: { type: ObjectId, ref: 'HouseholdMember', default: null }` — ใครเป็นผู้เพิ่ม/จัดการโปรไฟล์นี้ (ใช้กับสมาชิกไม่มีบัญชี)
  - `claimCode: { type: String, default: null }` และ `claimCodeExpiresAt` — รหัสลับสำหรับผูกบัญชีทีหลัง (คนละอันกับ invite code ของกลุ่ม เพราะ claim ผูกกับ *สมาชิกคนเดียว* ไม่ใช่ทั้งกลุ่ม)

### `src/modules/user/user.model.js`
- เพิ่มฟิลด์ `userCode: { type: String, unique: true, index: true }` — รหัสสั้นสุ่มอัตโนมัติตอนสมัคร (เช่น 8 ตัวอักษร แบบเดียวกับ `inviteCode` ของ household) ใช้ให้ผู้ใช้แชร์เองนอกระบบ แทนการค้นหาชื่อแบบเปิด

---

## 2. Endpoint ใหม่/แก้ไข

ทั้งหมดอยู่ใต้ `src/modules/household/` เว้นที่ระบุไว้เป็นอย่างอื่น

| Method & Path | คำอธิบาย | สิทธิ์ |
|---|---|---|
| `POST /households/:id/members` | สร้างสมาชิก **ไม่มีบัญชี** (name, relation, role, birthday ฯลฯ, ไม่ต้องมี userId) | owner/caregiver |
| `GET /users/lookup?code=XXXX` หรือ `?email=...` | หาบัญชีแบบ **exact match เท่านั้น** คืนแค่ `{_id, name, userCode}` ห้ามคืนอีเมล/ข้อมูลอ่อนไหวอื่น | ทุกคนที่ login แล้ว |
| `POST /households/:id/members/invite` | ส่งคำขอเพิ่มบัญชีที่มีอยู่แล้ว (ใช้ userId จาก lookup) → สร้าง HouseholdMember `membershipState: 'pending'` | owner/caregiver |
| `GET /users/me/pending-invites` | รายการคำขอเข้ากลุ่มที่ค้างอยู่ (ของบัญชีตัวเอง ข้ามทุกกลุ่ม) | เจ้าของบัญชี |
| `POST /households/:id/members/:memberId/accept` | ยอมรับคำขอ → `membershipState: 'active'` | เฉพาะเจ้าของ userId นั้น |
| `POST /households/:id/members/:memberId/decline` | ปฏิเสธคำขอ → ลบ record ทิ้ง | เฉพาะเจ้าของ userId นั้น |
| `POST /households/:id/members/:memberId/generate-claim-code` | สร้างรหัสผูกบัญชีสำหรับสมาชิกไม่มีบัญชี | owner/caregiver |
| `POST /households/claim` | สมาชิกไม่มีบัญชีเดิม ผูกบัญชีของตัวเองเข้ากับโปรไฟล์ ด้วย claimCode (คล้าย `/join` แต่เชื่อมโปรไฟล์เดิมแทนสร้างใหม่) | ผู้ใช้ที่ login แล้ว (ยังไม่มี membership ในกลุ่มนั้น) |

## 3. Schema validation (`household-member.schema.js`, `user.schema.js`)
- `createManagedMemberSchema`: `displayName`, `relation`, `role` (จำกัดแค่ `elder`/`viewer`, **ห้ามตั้ง owner/caregiver ให้โปรไฟล์ไม่มีบัญชี** เพราะ role นั้นต้องมีคนกดปุ่ม/รับผิดชอบเองได้), `birthday?`, `gender?`, `avatar?`
- `inviteExistingUserSchema`: `userId` (required), `role`, `displayName`, `relation`
- `lookupUserSchema`: `code` หรือ `email` (อย่างใดอย่างหนึ่ง, ต้อง exact match — **ห้ามทำ regex/partial search เด็ดขาด** เพื่อกันคนไล่หาชื่อผู้ใช้ทั้งระบบ)

## 4. Authorization ที่ต้องตรวจสอบเพิ่ม (`src/utils/household-scope.js`)
- `resolveWriteMemberId`/`assertOwnRecordOrPrivileged`: สมาชิก `userId: null` (ไม่มีบัญชี) **ไม่มีทาง "เป็นตัวเอง" ของ request ใดๆ ได้เลย** → ทุกการเขียนข้อมูลแทนสมาชิกไม่มีบัญชี (ยา/นัดหมาย/vitals) ต้องผ่านสิทธิ์ owner/caregiver เท่านั้น ไม่มี self-write กรณีนี้ — ควรเพิ่ม unit test คลุมเคสนี้โดยเฉพาะ
- `accept`/`decline` ต้องเช็คว่า `req.user._id === member.userId` เท่านั้นถึงจะทำได้ (คนอื่นกดแทนไม่ได้ แม้จะเป็น owner ของกลุ่มก็ตาม)
- `/households/claim`: ต้องเช็คว่า claimCode ยังไม่หมดอายุ และสมาชิกเป้าหมายยังไม่มี userId ผูกอยู่ก่อนแล้ว (กันเผลอเขียนทับ)

## 5. Migration
- Member เดิมทั้งหมดมี `userId` set อยู่แล้ว → เพิ่ม `membershipState: 'active'` (default) ให้ครบทุก record เดิมผ่าน migration script/`updateMany` ครั้งเดียวตอน deploy
- ต้อง sync/แก้ index `{householdId, userId}` เดิมเป็น partial unique ก่อน insert record `userId: null` ตัวแรก ไม่งั้น MongoDB จะ error ซ้ำ (null ซ้ำกันไม่ผ่าน unique index เดิม)

## 6. Response ที่ frontend ต้องรองรับเพิ่ม
- `GET /households/:id/members` จะมีสมาชิกที่ `membershipState: 'pending'` ปนมาด้วย — ต้อง filter ให้ถูก scope (frontend ต้องรู้ว่าอันไหน pending ไม่ใช่ active)
- User object (`/auth/login`, `/auth/register`) จะมี `userCode` เพิ่มมาด้วย ให้ frontend เก็บไว้โชว์ในหน้าโปรไฟล์

---

⚠️ **ข้อควรระวังเดิมที่ยังไม่ได้แก้ (พบระหว่าง smoke test ก่อนหน้านี้):** `data.user` ใน response ของ `/auth/register` และ `/auth/login` ยังส่ง `password` (bcrypt hash) กลับมาด้วย ควรแก้พร้อมกันตอนแตะโค้ด auth module รอบนี้ (`toJSON`/`select: false` บน field password ใน User model)
