const express = require('express')
const requireHouseholdRole = require('../../interfaces/http/middlewares/require-household-role.middleware')
const validationMiddleware = require('../../interfaces/http/middlewares/validation.middleware')
const { updateMemberSchema, createManagedMemberSchema, inviteExistingUserSchema } = require('./household-member.schema')
const controller = require('./household-member.controller')

// Mounted with { mergeParams: true } under /households/:householdId/members
// — householdMiddleware has already run by the time these handlers execute.
// (accept/decline/claim live on household.routes.js instead, precisely
// because they must NOT go through householdMiddleware — see there.)
const router = express.Router({ mergeParams: true })

router.get('/', controller.getMembers)
router.get('/:memberId', controller.getMember)
router.post('/', requireHouseholdRole('owner', 'caregiver'), validationMiddleware(createManagedMemberSchema), controller.createManagedMember)
router.post('/invite', requireHouseholdRole('owner', 'caregiver'), validationMiddleware(inviteExistingUserSchema), controller.inviteExistingUser)
// Fine-grained permission (self vs. owner/caregiver vs. role-change-is-owner-only)
// is resolved inside household-member.service.js#update, not here.
router.patch('/:memberId', validationMiddleware(updateMemberSchema), controller.updateMember)
router.delete('/:memberId', requireHouseholdRole('owner'), controller.removeMember)
router.post('/:memberId/check-in', controller.checkIn)
router.post('/:memberId/generate-claim-code', requireHouseholdRole('owner', 'caregiver'), controller.generateClaimCode)

module.exports = router
