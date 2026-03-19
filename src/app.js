import cookieParser from 'cookie-parser'
import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import hpp from 'hpp'
import morgan from 'morgan'
import authRoutes from './routes/authRoutes.js'
import menuRoutes from './routes/menuRoutes.js'
import orderRoutes from './routes/orderRoutes.js'
import { errorResponse, successResponse } from './utils/helpers.js'

dotenv.config()

const app = express()

const allowedOrigins = [process.env.CLIENT_URL, 'http://localhost:5173'].filter(Boolean)

function sanitizePayload(value) {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      value[index] = sanitizePayload(value[index])
    }
    return value
  }

  if (value && typeof value === 'object') {
    for (const [key, nestedValue] of Object.entries(value)) {
      if (key.startsWith('$') || key.includes('.')) {
        delete value[key]
        continue
      }
      value[key] = sanitizePayload(nestedValue)
    }
    return value
  }

  return value
}

function requestSanitizer(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    sanitizePayload(req.body)
  }

  if (req.query && typeof req.query === 'object') {
    sanitizePayload(req.query)
  }

  next()
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true)
      }
      return callback(new Error('CORS origin not allowed'))
    },
    credentials: true,
  }),
)
app.use(helmet())
app.use(
  rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
    max: Number(process.env.RATE_LIMIT_MAX || 200),
    standardHeaders: true,
    legacyHeaders: false,
  }),
)
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(requestSanitizer)
app.use(hpp())

app.get('/api/health', (req, res) => successResponse(res, 200, 'Server is healthy.', {
  uptime: process.uptime(),
}))

app.use('/api/auth', authRoutes)
app.use('/api/menu', menuRoutes)
app.use('/api/orders', orderRoutes)

app.use((req, res) => errorResponse(res, 404, 'Route not found.', 'ROUTE_NOT_FOUND'))

app.use((error, req, res, next) => {
  if (error.message === 'CORS origin not allowed') {
    return errorResponse(res, 403, 'CORS origin not allowed.', 'CORS_DENIED')
  }

  if (error?.code === 11000 || error?.code === 11001) {
    return errorResponse(res, 409, 'You already have an account.', 'ACCOUNT_EXISTS')
  }

  console.error(error)

  return errorResponse(
    res,
    error.statusCode || 500,
    process.env.NODE_ENV === 'production' ? 'Internal server error.' : error.message,
    error.code || 'INTERNAL_SERVER_ERROR',
  )
})

export default app
