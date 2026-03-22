import { Router } from 'express'
import { body, query } from 'express-validator'
import {
  forgotPassword,
  getMe,
  getUsers,
  login,
  logout,
  register,
  resetPassword,
} from '../controllers/authController.js'
import { optionalProtect, protect } from '../middleware/authMiddleware.js'
import { requireAdmin } from '../middleware/adminMiddleware.js'
import { validateRequest } from '../middleware/validationMiddleware.js'
import { normalizeEmail, normalizeText, sanitizePhone } from '../utils/helpers.js'

const router = Router()

router.post(
  '/register',
  [
    body('name')
      .customSanitizer(normalizeText)
      .isLength({ min: 2, max: 80 })
      .withMessage('Name must be between 2 and 80 characters.'),
    body('email')
      .optional({ values: 'falsy' })
      .customSanitizer(normalizeEmail)
      .isEmail()
      .withMessage('Provide a valid email.'),
    body('phone')
      .optional({ values: 'falsy' })
      .customSanitizer(sanitizePhone)
      .isLength({ min: 11, max: 16 })
      .withMessage('Provide a valid phone number.'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
  ],
  validateRequest,
  register,
)

router.post(
  '/login',
  [
    body('password').notEmpty().withMessage('Password is required.'),
    body('identity').optional({ values: 'falsy' }).customSanitizer(normalizeText),
    body('phone').optional({ values: 'falsy' }).customSanitizer(sanitizePhone),
    body().custom((value) => {
      if (!value.identity && !value.phone) {
        throw new Error('Email or phone is required.')
      }
      return true
    }),
  ],
  validateRequest,
  login,
)

router.post(
  '/forgot-password',
  [
    body('identity').optional({ values: 'falsy' }).customSanitizer(normalizeText),
    body('phone').optional({ values: 'falsy' }).customSanitizer(sanitizePhone),
    body().custom((value) => {
      if (!value.identity && !value.phone) {
        throw new Error('Email or phone is required.')
      }
      return true
    }),
  ],
  validateRequest,
  forgotPassword,
)

router.post(
  '/reset-password',
  [
    body('token').trim().notEmpty().withMessage('Reset token is required.'),
    body('password')
      .isLength({ min: 6, max: 100 })
      .withMessage('Password must be between 6 and 100 characters.'),
  ],
  validateRequest,
  resetPassword,
)

router.get('/me', optionalProtect, getMe)
router.get(
  '/users',
  protect,
  requireAdmin,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer.'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50.'),
    query('search').optional({ values: 'falsy' }).customSanitizer(normalizeText).isLength({ max: 120 }),
  ],
  validateRequest,
  getUsers,
)
router.post('/logout', logout)

export default router
