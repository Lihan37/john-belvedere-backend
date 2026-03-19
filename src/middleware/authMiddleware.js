import jwt from 'jsonwebtoken'
import { findUserById } from '../models/User.js'
import { errorResponse } from '../utils/helpers.js'

function getJwtVerifyOptions() {
  return {
    issuer: process.env.JWT_ISSUER || 'john-belvedere-ordering-backend',
    audience: process.env.JWT_AUDIENCE || 'john-belvedere-ordering-frontend',
  }
}

export async function protect(req, res, next) {
  try {
    const authHeader = req.headers.authorization || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!token) {
      return errorResponse(res, 401, 'Authentication required.', 'AUTH_REQUIRED')
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET, getJwtVerifyOptions())

    if (decoded.type !== 'access') {
      return errorResponse(res, 401, 'Invalid token type.', 'INVALID_TOKEN')
    }

    const user = await findUserById(decoded.sub, {
      projection: { password: 0 },
    })

    if (!user) {
      return errorResponse(res, 401, 'Invalid token.', 'INVALID_TOKEN')
    }

    req.user = user
    next()
  } catch {
    return errorResponse(res, 401, 'Invalid or expired token.', 'INVALID_TOKEN')
  }
}
