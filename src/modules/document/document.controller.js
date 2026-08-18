const { successResponse } = require('../../utils/response')
const service = require('./document.service')

const getDocuments = async (req, res, next) => {
  try {
    const data = await service.getAll(req.household._id, {
      memberId: req.query.memberId,
      kind: req.query.kind
    })
    res.json(successResponse(data))
  } catch (error) {
    next(error)
  }
}

const createDocument = async (req, res, next) => {
  try {
    const data = await service.createOne(req.household._id, req.membership, req.body)
    res.status(201).json(successResponse(data, 'Created successfully'))
  } catch (error) {
    next(error)
  }
}

const updateDocument = async (req, res, next) => {
  try {
    const data = await service.updateOne(req.params.documentId, req.household._id, req.body)
    res.json(successResponse(data, 'Updated successfully'))
  } catch (error) {
    next(error)
  }
}

const deleteDocument = async (req, res, next) => {
  try {
    await service.deleteOne(req.params.documentId, req.household._id)
    res.json(successResponse(null, 'Deleted successfully'))
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getDocuments,
  createDocument,
  updateDocument,
  deleteDocument
}
