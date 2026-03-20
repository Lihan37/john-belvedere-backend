import dotenv from 'dotenv'
import app from './app.js'
import { connectDB } from './config/db.js'
import { seedMenuIfEmpty } from './utils/seedMenu.js'
import { logger } from './utils/logger.js'

dotenv.config()

const port = Number(process.env.PORT || 5000)

async function startServer() {
  try {
    await connectDB()

    if (process.env.NODE_ENV !== 'production') {
      await seedMenuIfEmpty()
    }

    app.listen(port, () => {
      logger.info('Server running', { port, nodeEnv: process.env.NODE_ENV })
    })
  } catch (error) {
    logger.error('Failed to start server', { message: error.message, stack: error.stack })
    process.exit(1)
  }
}

startServer()
