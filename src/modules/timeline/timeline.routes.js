const express = require('express')
const controller = require('./timeline.controller')

// Mounted with { mergeParams: true } under /households/:householdId/timeline.
// Read-only by design — the only writer is timelineService.recordEvent,
// called internally by other modules.
const router = express.Router({ mergeParams: true })

router.get('/', controller.getTimeline)

module.exports = router
