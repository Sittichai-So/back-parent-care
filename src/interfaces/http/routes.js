const express = require('express')
const authModule = require('../../modules/auth')
const userModule = require('../../modules/user')
const householdModule = require('../../modules/household')
const notificationModule = require('../../modules/notification')
const hospitalModule = require('../../modules/hospital')
const uploadModule = require('../../modules/upload')

const router = express.Router()

router.use('/auth', authModule)
router.use('/users', userModule)
// Medicines, medication-logs, appointments, vitals, tasks and emergency all
// live nested under /households/:householdId/... (see household.routes.js)
// since they only make sense scoped to one shared household.
router.use('/households', householdModule)
router.use('/notifications', notificationModule)
router.use('/hospitals', hospitalModule)
router.use('/uploads', uploadModule)

module.exports = router
