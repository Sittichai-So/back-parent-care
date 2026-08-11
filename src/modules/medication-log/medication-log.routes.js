const express = require('express')
const controller = require('./medication-log.controller')

// Mounted with { mergeParams: true } under /households/:householdId/medication-logs
const router = express.Router({ mergeParams: true })

router.get('/', controller.getMedicationLogs)

module.exports = router
