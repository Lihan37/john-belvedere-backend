import { Router } from 'express'
import { body, param } from 'express-validator'
import { createOrder, getOrders, updateOrderStatus } from '../controllers/orderController.js'
import { protect } from '../middleware/authMiddleware.js'
import { requireAdmin } from '../middleware/adminMiddleware.js'
import { validateRequest } from '../middleware/validationMiddleware.js'

const router = Router()

router.post(
  '/',
  [
    body('tableNumber').trim().notEmpty().withMessage('Table number is required.'),
    body('totalPrice').isFloat({ min: 0 }).withMessage('Total price must be valid.'),
    body('customerId').optional({ values: 'falsy' }).isString(),
    body('items').isArray({ min: 1 }).withMessage('At least one order item is required.'),
    body('items.*.menuItemId').optional({ values: 'falsy' }).isString(),
    body('items.*.name').trim().notEmpty().withMessage('Item name is required.'),
    body('items.*.price').isFloat({ min: 0 }).withMessage('Item price must be valid.'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Item quantity must be at least 1.'),
  ],
  validateRequest,
  createOrder,
)

router.get('/', protect, requireAdmin, getOrders)

router.put(
  '/:id/status',
  protect,
  requireAdmin,
  [
    param('id').isMongoId().withMessage('Invalid order id.'),
    body('status').isIn(['pending', 'preparing', 'served']).withMessage('Invalid order status.'),
  ],
  validateRequest,
  updateOrderStatus,
)

export default router
