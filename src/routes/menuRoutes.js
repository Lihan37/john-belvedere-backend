import { Router } from 'express'
import { body, param } from 'express-validator'
import {
  createMenuItem,
  deleteMenuItem,
  getMenu,
  updateMenuItem,
} from '../controllers/menuController.js'
import { protect } from '../middleware/authMiddleware.js'
import { requireAdmin } from '../middleware/adminMiddleware.js'
import { validateRequest } from '../middleware/validationMiddleware.js'
import { normalizeText, roundPrice } from '../utils/helpers.js'

const router = Router()

router.get('/', getMenu)

router.post(
  '/',
  protect,
  requireAdmin,
  [
    body('name')
      .customSanitizer(normalizeText)
      .isLength({ min: 2, max: 120 })
      .withMessage('Name must be between 2 and 120 characters.'),
    body('price')
      .customSanitizer(roundPrice)
      .isFloat({ min: 0, max: 100000 })
      .withMessage('Price must be a non-negative number.'),
    body('image').isURL().withMessage('Image must be a valid URL.'),
    body('category')
      .customSanitizer(normalizeText)
      .isLength({ min: 2, max: 80 })
      .withMessage('Category must be between 2 and 80 characters.'),
    body('description')
      .customSanitizer(normalizeText)
      .isLength({ min: 8, max: 500 })
      .withMessage('Description must be between 8 and 500 characters.'),
  ],
  validateRequest,
  createMenuItem,
)

router.put(
  '/:id',
  protect,
  requireAdmin,
  [
    param('id').isMongoId().withMessage('Invalid menu item id.'),
    body('name').optional().customSanitizer(normalizeText).isLength({ min: 2, max: 120 }),
    body('price').optional().customSanitizer(roundPrice).isFloat({ min: 0, max: 100000 }),
    body('image').optional().isURL().withMessage('Image must be a valid URL.'),
    body('category').optional().customSanitizer(normalizeText).isLength({ min: 2, max: 80 }),
    body('description').optional().customSanitizer(normalizeText).isLength({ min: 8, max: 500 }),
    body().custom((value) => {
      const allowedFields = ['name', 'price', 'image', 'category', 'description']
      const hasUpdatableField = allowedFields.some((field) => field in value)
      if (!hasUpdatableField) {
        throw new Error('At least one updatable field is required.')
      }
      return true
    }),
  ],
  validateRequest,
  updateMenuItem,
)

router.delete(
  '/:id',
  protect,
  requireAdmin,
  [param('id').isMongoId().withMessage('Invalid menu item id.')],
  validateRequest,
  deleteMenuItem,
)

export default router
