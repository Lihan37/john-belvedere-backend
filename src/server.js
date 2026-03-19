import dotenv from 'dotenv'
import app from './app.js'
import { connectDB } from './config/db.js'
import { seedMenuIfEmpty } from './utils/seedMenu.js'

dotenv.config()

const port = Number(process.env.PORT || 5000)

async function startServer() {
  try {
    await connectDB()

    if (process.env.NODE_ENV !== 'production') {
      await seedMenuIfEmpty()
    }

    app.listen(port, () => {
      console.log(`Server running on port ${port}`)
    })
  } catch (error) {
    console.error('Failed to start server', error)
    process.exit(1)
  }
}

startServer()
