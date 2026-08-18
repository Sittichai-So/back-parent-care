const createError = (message, statusCode) => {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

/**
 * Resolves which HouseholdMember a *new* record should belong to (e.g.
 * logging a medication dose, adding a vitals entry).
 * - owner/caregiver must specify who it's for and may target anyone.
 * - elder may only ever target themself — an omitted memberId defaults to
 *   themself, and an explicit one pointing elsewhere is rejected.
 * - viewer can never write.
 *
 * A member profile with no linked account (userId: null — see
 * household-member.model.js) can never be `membership` here: `membership`
 * always comes from householdMiddleware, which looks a HouseholdMember up by
 * userId: req.user.id, and a userId-less profile can never log in to
 * produce that req.user.id in the first place. So every write made "on
 * behalf of" such a profile necessarily arrives as an owner/caregiver
 * targeting someone else, never as a self-write — this file doesn't need to
 * special-case it, but that invariant is exactly why it's safe not to.
 */
const resolveWriteMemberId = (membership, requestedMemberId) => {
  if (membership.role === 'viewer') {
    throw createError('ผู้ใช้สิทธิ์ดูอย่างเดียวไม่สามารถแก้ไขข้อมูลได้', 403)
  }

  if (membership.role === 'owner' || membership.role === 'caregiver') {
    if (!requestedMemberId) {
      throw createError('กรุณาระบุสมาชิกที่ต้องการบันทึกข้อมูลให้', 400)
    }
    return String(requestedMemberId)
  }

  // elder
  if (requestedMemberId && String(requestedMemberId) !== String(membership._id)) {
    throw createError('ผู้สูงอายุบันทึกข้อมูลได้เฉพาะของตัวเองเท่านั้น', 403)
  }
  return String(membership._id)
}

/**
 * Guards an update/delete on an EXISTING resource that already has a target
 * memberId (e.g. editing a vitals entry, changing a task's status).
 */
const assertOwnRecordOrPrivileged = (membership, targetMemberId) => {
  if (membership.role === 'owner' || membership.role === 'caregiver') return
  if (membership.role === 'elder' && targetMemberId && String(targetMemberId) === String(membership._id)) return
  throw createError('คุณไม่มีสิทธิ์แก้ไขรายการนี้', 403)
}

module.exports = {
  resolveWriteMemberId,
  assertOwnRecordOrPrivileged
}
