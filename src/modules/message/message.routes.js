const express = require('express')
const controller = require('./message.controller')
const requireHouseholdRole = require('../../interfaces/http/middlewares/require-household-role.middleware')
const validationMiddleware = require('../../interfaces/http/middlewares/validation.middleware')
const { messageCreateSchema } = require('./message.schema')

// Mounted with { mergeParams: true } under /households/:householdId/messages
const router = express.Router({ mergeParams: true })

// Readable by every member including viewers — the design's read-only mode
// still shows the conversation, it just disables the composer.
router.get('/', controller.getMessages)

// The REST twin of the socket's `send_message`: same service call, same
// broadcast, so a client that never opens a socket can still take part.
// Viewers are excluded here and again in the service, which is what the
// socket path relies on.
router.post(
  '/',
  requireHouseholdRole('owner', 'caregiver', 'elder'),
  validationMiddleware(messageCreateSchema),
  controller.createMessage
)

// Not role-restricted: the service lets anyone remove their own message and
// owner/caregiver remove any.
router.delete('/:messageId', controller.deleteMessage)

module.exports = router
