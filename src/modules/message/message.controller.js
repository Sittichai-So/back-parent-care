const { successResponse } = require('../../utils/response')
const service = require('./message.service')

const getMessages = async (req, res, next) => {
  try {
    const data = await service.getHistory(req.household._id, {
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      before: req.query.before
    })
    res.json(successResponse(data))
  } catch (error) {
    next(error)
  }
}

const createMessage = async (req, res, next) => {
  try {
    const data = await service.sendMessage(req.household._id, req.membership, req.body)
    res.status(201).json(successResponse(data, 'Message sent'))
  } catch (error) {
    next(error)
  }
}

const deleteMessage = async (req, res, next) => {
  try {
    await service.deleteMessage(req.params.messageId, req.household._id, req.membership)
    res.json(successResponse(null, 'Deleted successfully'))
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getMessages,
  createMessage,
  deleteMessage
}
