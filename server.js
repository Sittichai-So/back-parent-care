const { loadEnv } = require('./src/config/env')
const { connectDatabase } = require('./src/config/database')
const app = require('./src/app')

loadEnv()

const PORT = process.env.PORT || 3000

connectDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Parent Care Backend is running on port ${PORT}`)
    })
  })
  .catch((error) => {
    console.error('Database connection failed', error)
    process.exit(1)
  })
