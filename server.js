const http = require('http')
const { loadEnv } = require('./src/config/env')
const { connectDatabase } = require('./src/config/database')
const app = require('./src/app')
const { initSocket } = require('./src/interfaces/socket')

loadEnv()

const PORT = process.env.PORT || 3000

// Express is wrapped in an explicit http.Server (rather than app.listen)
// only so Socket.IO can share it — one port, one process, same JWT. See
// src/interfaces/socket/index.js.
const server = http.createServer(app)
initSocket(server)

connectDatabase()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Parent Care Backend is running on port ${PORT}`)
      console.log(`Socket.IO listening on the same port at /socket.io`)
    })
  })
  .catch((error) => {
    console.error('Database connection failed', error)
    process.exit(1)
  })
