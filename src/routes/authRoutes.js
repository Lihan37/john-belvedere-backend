import { Router } from 'express'
import { body } from 'express-validator'
import { getMe, login, logout, register } from '../controllers/authController.js'
import { protect } from '../middleware/authMiddleware.js'
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

router.get('/me', protect, getMe)
router.post('/logout', logout)

export default router
