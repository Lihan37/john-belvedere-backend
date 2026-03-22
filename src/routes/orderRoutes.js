import { Router } from 'express'
import { body, param } from 'express-validator'
import {
  createOrder,
  createStripeCheckout,
  getDailyOrderReport,
  getMyOrders,
  getOrders,
  getStripeCheckoutSessionStatus,
  handleStripeWebhook,
  updateOrderPaymentStatus,
  updateOrderStatus,
} from '../controllers/orderController.js'
import { protect } from '../middleware/authMiddleware.js'
import { requireAdmin } from '../middleware/adminMiddleware.js'
import { validateRequest } from '../middleware/validationMiddleware.js'
import { normalizeText, roundPrice } from '../utils/helpers.js'

const router = Router()

const orderBodyValidators = [
  body('paymentMethod')
    .isIn(['stripe', 'counter'])
    .withMessage('Payment method must be stripe or counter.'),
  body('totalPrice')
    .customSanitizer(roundPrice)
    .isFloat({ min: 0, max: 1000000 })
    .withMessage('Total price must be valid.'),
  body('customerId').optional({ values: 'falsy' }).isMongoId().withMessage('Invalid customer id.'),
  body('items').isArray({ min: 1, max: 25 }).withMessage('At least one order item is required.'),
  body('items.*.menuItemId').optional({ values: 'falsy' }).isMongoId().withMessage('Invalid menu item id.'),
  body('items.*.name')
    .customSanitizer(normalizeText)
    .isLength({ min: 2, max: 120 })
    .withMessage('Item name is required.'),
  body('items.*.price')
    .customSanitizer(roundPrice)
    .isFloat({ min: 0, max: 100000 })
    .withMessage('Item price must be valid.'),
  body('items.*.quantity').isInt({ min: 1, max: 20 }).withMessage('Item quantity must be at least 1.'),
]

router.post('/stripe/webhook', handleStripeWebhook)

router.post(
  '/',
  protect,
  orderBodyValidators,
  validateRequest,
  createOrder,
)

router.post(
  '/checkout/stripe',
  protect,
  orderBodyValidators,
  validateRequest,
  createStripeCheckout,
)

router.get('/', protect, requireAdmin, getOrders)
router.get('/my', protect, getMyOrders)
router.get('/reports/daily', protect, requireAdmin, getDailyOrderReport)
router.get(
  '/checkout/stripe/session/:sessionId',
  protect,
  [param('sessionId').notEmpty().withMessage('Session id is required.')],
  validateRequest,
  getStripeCheckoutSessionStatus,
)

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

router.put(
  '/:id/payment',
  protect,
  requireAdmin,
  [
    param('id').isMongoId().withMessage('Invalid order id.'),
    body('paymentStatus').isIn(['paid', 'unpaid']).withMessage('Invalid payment status.'),
  ],
  validateRequest,
  updateOrderPaymentStatus,
)

export default router
