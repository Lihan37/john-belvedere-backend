import bcrypt from 'bcryptjs'
import { matchedData } from 'express-validator'
import {
  createUser,
  findUserByEmailOrPhone,
  updateUserById,
} from '../models/User.js'
import { generateToken } from '../utils/generateToken.js'
import {
  buildAuthPayload,
  normalizeEmail,
  errorResponse,
  getAllowedAdminPhones,
  sanitizePhone,
  successResponse,
} from '../utils/helpers.js'

function resolveRole(phone) {
  const normalizedPhone = sanitizePhone(phone)
  return getAllowedAdminPhones().includes(normalizedPhone) ? 'admin' : 'customer'
}

function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production'
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7,
    path: '/',
  }
}

function setAuthCookie(res, token) {
  const cookieName = process.env.JWT_COOKIE_NAME || 'jb_access_token'
  res.cookie(cookieName, token, getCookieOptions())
}

function clearAuthCookie(res) {
  const cookieName = process.env.JWT_COOKIE_NAME || 'jb_access_token'
  res.clearCookie(cookieName, getCookieOptions())
}

export async function register(req, res, next) {
  try {
    const data = matchedData(req, { locations: ['body'] })
    const email = data.email ? normalizeEmail(data.email) : undefined
    const phone = data.phone ? sanitizePhone(data.phone) : undefined

    if (!email && !phone) {
      return errorResponse(res, 422, 'Email or phone is required.', 'CONTACT_REQUIRED')
    }

    const existingUser = await findUserByEmailOrPhone({ email, phone })

    if (existingUser) {
      return errorResponse(res, 409, 'You already have an account.', 'ACCOUNT_EXISTS')
    }

    const hashedPassword = await bcrypt.hash(data.password, 12)
    const role = resolveRole(phone)

    const user = await createUser({
      name: data.name,
      email,
      phone,
      password: hashedPassword,
      role,
    })

    const token = generateToken(user)

    setAuthCookie(res, token)

    return successResponse(res, 201, 'Account created successfully.', {
      user: buildAuthPayload(user),
    })
  } catch (error) {
    next(error)
  }
}

export async function login(req, res, next) {
  try {
    const identity = req.body.identity ? normalizeEmail(req.body.identity) : undefined
    const phone = req.body.phone ? sanitizePhone(req.body.phone) : undefined
    const requestedRole = req.body.role

    const user = await findUserByEmailOrPhone({
      email: identity,
      phone: phone || sanitizePhone(identity),
    })

    if (!user) {
      return errorResponse(res, 404, 'No account found. Please sign up first.', 'ACCOUNT_NOT_FOUND')
    }

    const passwordMatches = await bcrypt.compare(req.body.password, user.password)

    if (!passwordMatches) {
      return errorResponse(res, 401, 'Invalid credentials.', 'INVALID_CREDENTIALS')
    }

    const allowedPhones = getAllowedAdminPhones()
    const normalizedPhone = sanitizePhone(user.phone || '')
    if (requestedRole === 'admin') {
      if (!allowedPhones.includes(normalizedPhone)) {
        return errorResponse(res, 403, 'This phone number is not authorized for admin access.', 'ADMIN_ONLY')
      }
      if (user.role !== 'admin') {
        user.role = 'admin'
        await updateUserById(user._id, { role: 'admin' })
      }
    }

    const token = generateToken(user)

    setAuthCookie(res, token)

    return successResponse(res, 200, 'Login successful.', {
      user: buildAuthPayload(user),
    })
  } catch (error) {
    next(error)
  }
}

export async function getMe(req, res) {
  return successResponse(res, 200, 'Authenticated user loaded.', {
    user: buildAuthPayload(req.user),
  })
}

export async function logout(req, res) {
  clearAuthCookie(res)
  return successResponse(res, 200, 'Logout successful.', null)
}
