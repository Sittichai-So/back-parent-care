const { successResponse } = require('../../utils/response')
const service = require('./handoff-note.service')

const getHandoffNotes = async (req, res, next) => {
  try {
    const data = await service.getAll(req.household._id, { limit: req.query.limit })
    res.json(successResponse(data))
  } catch (error) {
    next(error)
  }
}

const createHandoffNote = async (req, res, next) => {
  try {
    const data = await service.createOne(req.household._id, req.membership, req.body)
    res.status(201).json(successResponse(data, 'Created successfully'))
  } catch (error) {
    next(error)
  }
}

const deleteHandoffNote = async (req, res, next) => {
  try {
    await service.deleteOne(req.params.noteId, req.household._id, req.membership)
    res.json(successResponse(null, 'Deleted successfully'))
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getHandoffNotes,
  createHandoffNote,
  deleteHandoffNote
}
