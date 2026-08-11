const { successResponse } = require('../../utils/response')
const service = require('./notification.service')

const getNotifications = async (req, res, next) => {
  try {
    const data = await service.getAll(req.user.id)
    res.json(successResponse(data))
  } catch (error) {
    next(error)
  }
}

const readNotification = async (req, res, next) => {
  try {
    const data = await service.markAsRead(req.params.id)
    res.json(successResponse(data, 'Marked as read'))
  } catch (error) {
    next(error)
  }
}

const readAllNotifications = async (req, res, next) => {
  try {
    await service.markAllAsRead(req.user.id)
    res.json(successResponse(null, 'All notifications marked as read'))
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getNotifications,
  readNotification,
  readAllNotifications
}
