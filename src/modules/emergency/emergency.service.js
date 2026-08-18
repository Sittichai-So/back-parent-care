const repository = require('./emergency.repository')
const householdMemberRepository = require('../household/household-member.repository')
const notificationService = require('../notification/notification.service')
const timelineService = require('../timeline/timeline.service')
const { resolveWriteMemberId } = require('../../utils/household-scope')

const createError = (message, statusCode) => {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

const trigger = async (householdId, membership, { forMemberId, message, location }) => {
  if (membership.role === 'viewer') {
    throw createError('ผู้ใช้สิทธิ์ดูอย่างเดียวแจ้งเหตุฉุกเฉินไม่ได้', 403)
  }

  const targetMemberId = resolveWriteMemberId(membership, forMemberId || String(membership._id))
  const targetMember = await householdMemberRepository.findById(targetMemberId)
  if (!targetMember || String(targetMember.householdId) !== String(householdId)) {
    throw createError('ไม่พบสมาชิกนี้', 404)
  }

  const alert = await repository.create({
    householdId,
    triggeredByMemberId: membership._id,
    forMemberId: targetMemberId,
    message: message || null,
    location: location || null
  })

  await timelineService.recordEvent({
    householdId,
    actorMemberId: membership._id,
    relatedMemberId: targetMemberId,
    type: 'emergency',
    title: `ขอความช่วยเหลือ: ${targetMember.displayName}`,
    detail: message || '',
    relatedId: alert._id
  })

  // Notify every other active member — the one explicit "send an in-app
  // notification" case in this app, deliberately not done for routine
  // medication/appointment/vitals/check-in activity (timeline covers those).
  // Members with no linked account (userId: null — see
  // household-member.service.js#createManagedMember) have nowhere to
  // receive a notification and would fail Notification's required userId
  // validation, so they're skipped here rather than left to reject the
  // whole Promise.all and mask an otherwise-successful trigger.
  const members = await householdMemberRepository.findAll({ householdId, isActive: true })
  await Promise.all(
    members
      .filter((member) => String(member._id) !== String(membership._id) && member.userId)
      .map((member) =>
        notificationService.create({
          userId: member.userId,
          householdId,
          type: 'EMERGENCY',
          title: `${targetMember.displayName} ต้องการความช่วยเหลือ`,
          message: message || 'กดเพื่อดูรายละเอียด',
          data: { alertId: alert._id, forMemberId: targetMemberId }
        })
      )
  )

  return alert
}

const listRecent = async (householdId, { limit = 20 } = {}) => {
  return repository.findAll({ householdId }, { limit })
}

const resolve = async (id, householdId, membership) => {
  const alert = await repository.findById(id)
  if (!alert || String(alert.householdId) !== String(householdId)) {
    throw createError('ไม่พบการแจ้งเหตุนี้', 404)
  }

  const isPrivileged = membership.role === 'owner' || membership.role === 'caregiver'
  const isTriggerer = String(alert.triggeredByMemberId) === String(membership._id)
  if (!isPrivileged && !isTriggerer) {
    throw createError('คุณไม่มีสิทธิ์ปิดการแจ้งเหตุนี้', 403)
  }

  return repository.updateById(id, { status: 'resolved' })
}

module.exports = {
  trigger,
  listRecent,
  resolve
}
