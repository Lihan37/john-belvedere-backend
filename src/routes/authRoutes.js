import { Router } from 'express'
import { body } from 'express-validator'
import { getMe, login, register } from '../controllers/authController.js'
import { protect } from '../middleware/authMiddleware.js'
import { validateRequest } from '../middleware/validationMiddleware.js'

const router = Router()

router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required.'),
    body('email').optional({ values: 'falsy' }).isEmail().withMessage('Provide a valid email.'),
    body('phone').optional({ values: 'falsy' }).isLength({ min: 11, max: 16 }).withMessage('Provide a valid phone number.'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
  ],
  validateRequest,
  register,
)

router.post(
  '/login',
  [
    body('password').notEmpty().withMessage('Password is required.'),
    body('identity').optional({ values: 'falsy' }).trim(),
    body('phone').optional({ values: 'falsy' }).trim(),
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

export default router
