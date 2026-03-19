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

const router = Router()

router.get('/', getMenu)

router.post(
  '/',
  protect,
  requireAdmin,
  [
    body('name').trim().notEmpty().withMessage('Name is required.'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a non-negative number.'),
    body('image').trim().notEmpty().withMessage('Image is required.'),
    body('category').trim().notEmpty().withMessage('Category is required.'),
    body('description').trim().notEmpty().withMessage('Description is required.'),
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
    body('name').optional().trim().notEmpty(),
    body('price').optional().isFloat({ min: 0 }),
    body('image').optional().trim().notEmpty(),
    body('category').optional().trim().notEmpty(),
    body('description').optional().trim().notEmpty(),
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
