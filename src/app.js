const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const routes = require('./interfaces/http/routes')
const { errorHandler, notFoundHandler } = require('./interfaces/http/middlewares/error.middleware')

const app = express()

app.use(helmet())
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(morgan('dev'))

app.use('/api', routes)
app.use(notFoundHandler)
app.use(errorHandler)

module.exports = app
