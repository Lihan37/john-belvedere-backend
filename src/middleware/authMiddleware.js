import jwt from 'jsonwebtoken'
import { findUserById } from '../models/User.js'
import { errorResponse } from '../utils/helpers.js'

function getJwtVerifyOptions() {
  return {
    issuer: process.env.JWT_ISSUER || 'john-belvedere-ordering-backend',
    audience: process.env.JWT_AUDIENCE || 'john-belvedere-ordering-frontend',
  }
}

async function resolveAuthenticatedUser(req) {
  const authHeader = req.headers.authorization || ''
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  const cookieName = process.env.JWT_COOKIE_NAME || 'jb_access_token'
  const token = req.cookies?.[cookieName] || bearerToken

  if (!token) {
    return null
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET, getJwtVerifyOptions())

  if (decoded.type !== 'access') {
    throw new Error('INVALID_TOKEN_TYPE')
  }

  const user = await findUserById(decoded.sub, {
    projection: { password: 0 },
  })

  if (!user) {
    throw new Error('INVALID_TOKEN')
  }

  return user
}

export async function protect(req, res, next) {
  try {
    const user = await resolveAuthenticatedUser(req)

    if (!user) {
      return errorResponse(res, 401, 'Authentication required.', 'AUTH_REQUIRED')
    }

    req.user = user
    next()
  } catch {
    return errorResponse(res, 401, 'Invalid or expired token.', 'INVALID_TOKEN')
  }
}

export async function optionalProtect(req, res, next) {
  try {
    req.user = await resolveAuthenticatedUser(req)
    next()
  } catch {
    req.user = null
    next()
  }
}
