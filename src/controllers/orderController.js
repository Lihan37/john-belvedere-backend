import { matchedData } from 'express-validator'
import { isValidObjectId } from '../config/db.js'
import {
  createOrderRecord,
  findAllOrders,
  findOrderById,
  findOrderByStripeSessionId,
  findOrdersInDateRange,
  findOrdersByCustomerId,
  updateOrderById,
  updateOrderPaymentStatusById,
  updateOrderStatusById,
} from '../models/Order.js'
import { findUserById } from '../models/User.js'
import { sendOrderNotificationEmail } from '../lib/mailer.js'
import { getStripeClient } from '../lib/stripe.js'
import {
  calculateOrderTotal,
  errorResponse,
  publicOrder,
  successResponse,
} from '../utils/helpers.js'
import { createAuditLog } from '../models/AuditLog.js'
import { logger } from '../utils/logger.js'

function getStripeConfigError() {
  if (!process.env.STRIPE_SECRET_KEY) {
    return 'STRIPE_SECRET_KEY is not configured.'
  }

  if (!process.env.STRIPE_SUCCESS_URL) {
    return 'STRIPE_SUCCESS_URL is not configured.'
  }

  if (!process.env.STRIPE_CANCEL_URL) {
    return 'STRIPE_CANCEL_URL is not configured.'
  }

  return null
}

function buildOrderPayload(data, req, customer = null) {
  return {
    ...data,
    customerId:
      req.user?._id || (data.customerId && isValidObjectId(data.customerId)
        ? data.customerId
        : null),
    customerName: customer?.name || req.user?.name || 'Guest',
    customerEmail: customer?.email || req.user?.email || '',
    customerPhone: customer?.phone || req.user?.phone || '',
  }
}

async function resolveCustomerSnapshot(req, customerId) {
  const resolvedCustomerId = req.user?._id || customerId

  if (!resolvedCustomerId || !isValidObjectId(resolvedCustomerId)) {
    return null
  }

  return findUserById(resolvedCustomerId, {
    projection: { password: 0 },
  })
}

export async function createOrder(req, res, next) {
  try {
    const data = matchedData(req, { locations: ['body'] })

    if (data.paymentMethod === 'stripe') {
      return errorResponse(
        res,
        422,
        'Use Stripe checkout for card payments.',
        'STRIPE_CHECKOUT_REQUIRED',
      )
    }

    const computedTotal = calculateOrderTotal(data.items)
    if (computedTotal !== data.totalPrice) {
      return errorResponse(res, 422, 'Order total does not match item totals.', 'ORDER_TOTAL_MISMATCH', {
        expectedTotal: computedTotal,
      })
    }

    const customer = await resolveCustomerSnapshot(req, data.customerId)
    const payload = buildOrderPayload(data, req, customer)

    const order = await createOrderRecord(payload)
    void sendOrderNotificationEmail(order).catch((error) => {
      logger.error('Failed to send counter order email', { message: error.message, orderId: order._id?.toString?.() })
    })
    return successResponse(res, 201, 'Order created successfully.', publicOrder(order))
  } catch (error) {
    next(error)
  }
}

export async function getOrders(req, res, next) {
  try {
    const orders = await findAllOrders()
    return successResponse(res, 200, 'Orders fetched successfully.', orders.map(publicOrder))
  } catch (error) {
    next(error)
  }
}

export async function getMyOrders(req, res, next) {
  try {
    const orders = await findOrdersByCustomerId(req.user._id)
    return successResponse(res, 200, 'Customer orders fetched successfully.', orders.map(publicOrder))
  } catch (error) {
    next(error)
  }
}

export async function createStripeCheckout(req, res, next) {
  try {
    const stripeConfigError = getStripeConfigError()
    if (stripeConfigError) {
      return errorResponse(res, 500, stripeConfigError, 'STRIPE_NOT_CONFIGURED')
    }

    const data = matchedData(req, { locations: ['body'] })
    const computedTotal = calculateOrderTotal(data.items)
    if (computedTotal !== data.totalPrice) {
      return errorResponse(res, 422, 'Order total does not match item totals.', 'ORDER_TOTAL_MISMATCH', {
        expectedTotal: computedTotal,
      })
    }

    const customer = await resolveCustomerSnapshot(req, data.customerId)
    const payload = buildOrderPayload({ ...data, paymentMethod: 'stripe' }, req, customer)
    const order = await createOrderRecord(payload)
    const stripe = getStripeClient()

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      success_url: process.env.STRIPE_SUCCESS_URL,
      cancel_url: process.env.STRIPE_CANCEL_URL,
      client_reference_id: order._id.toString(),
      customer_email: order.customerEmail || undefined,
      metadata: {
        orderId: order._id.toString(),
      },
      line_items: (order.items || []).map((item) => ({
        quantity: Number(item.quantity || 1),
        price_data: {
          currency: 'aud',
          unit_amount: Math.round(Number(item.price || 0) * 100),
          product_data: {
            name: item.name,
          },
        },
      })),
    })

    const updatedOrder = await updateOrderById(order._id, {
      stripeCheckoutSessionId: session.id,
      stripeCheckoutSessionUrl: session.url,
    })

    await createAuditLog({
      actorUserId: req.user?._id,
      actorRole: req.user?.role,
      actorPhone: req.user?.phone,
      action: 'order.checkout.stripe.created',
      entityType: 'order',
      entityId: updatedOrder._id?.toString?.(),
      requestId: req.requestId,
      metadata: { sessionId: session.id },
    })

    return successResponse(res, 201, 'Stripe checkout created successfully.', {
      order: publicOrder(updatedOrder),
      checkoutUrl: session.url,
      sessionId: session.id,
    })
  } catch (error) {
    next(error)
  }
}

export async function updateOrderStatus(req, res, next) {
  try {
    const { status } = matchedData(req, { locations: ['body'] })
    const order = await updateOrderStatusById(req.params.id, status)
    if (!order) {
      return errorResponse(res, 404, 'Order not found.', 'ORDER_NOT_FOUND')
    }

    await createAuditLog({
      actorUserId: req.user?._id,
      actorRole: req.user?.role,
      actorPhone: req.user?.phone,
      action: 'order.status.updated',
      entityType: 'order',
      entityId: req.params.id,
      requestId: req.requestId,
      metadata: { status },
    })

    return successResponse(res, 200, 'Order status updated successfully.', publicOrder(order))
  } catch (error) {
    next(error)
  }
}

export async function getStripeCheckoutSessionStatus(req, res, next) {
  try {
    const { sessionId } = matchedData(req, { locations: ['params'] })
    const order = await findOrderByStripeSessionId(sessionId)

    if (!order) {
      return errorResponse(res, 404, 'Checkout session not found.', 'CHECKOUT_SESSION_NOT_FOUND')
    }

    const requesterId = req.user?._id?.toString?.() || req.user?._id || null
    const orderCustomerId = order.customerId?.toString?.() || order.customerId || null

    if (requesterId && orderCustomerId && requesterId !== orderCustomerId && req.user?.role !== 'admin') {
      return errorResponse(res, 403, 'You cannot access this checkout session.', 'FORBIDDEN')
    }

    return successResponse(res, 200, 'Checkout session status fetched successfully.', {
      order: publicOrder(order),
    })
  } catch (error) {
    next(error)
  }
}

export async function updateOrderPaymentStatus(req, res, next) {
  try {
    const { paymentStatus } = matchedData(req, { locations: ['body'] })
    const order = await updateOrderPaymentStatusById(req.params.id, paymentStatus)
    if (!order) {
      return errorResponse(res, 404, 'Order not found.', 'ORDER_NOT_FOUND')
    }

    await createAuditLog({
      actorUserId: req.user?._id,
      actorRole: req.user?.role,
      actorPhone: req.user?.phone,
      action: 'order.payment.updated',
      entityType: 'order',
      entityId: req.params.id,
      requestId: req.requestId,
      metadata: { paymentStatus },
    })

    return successResponse(res, 200, 'Order payment status updated successfully.', publicOrder(order))
  } catch (error) {
    next(error)
  }
}

export async function getDailyOrderReport(req, res, next) {
  try {
    const dateInput = typeof req.query.date === 'string' ? req.query.date.trim() : ''
    const targetDate = dateInput ? new Date(`${dateInput}T00:00:00`) : new Date()

    if (Number.isNaN(targetDate.getTime())) {
      return errorResponse(res, 422, 'Date must be in YYYY-MM-DD format.', 'INVALID_REPORT_DATE')
    }

    const startDate = new Date(targetDate)
    startDate.setHours(0, 0, 0, 0)

    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + 1)

    const orders = await findOrdersInDateRange(startDate, endDate)

    const summary = orders.reduce(
      (accumulator, order) => {
        const totalPrice = Number(order.totalPrice || 0)
        const paymentStatus = order.paymentStatus || 'unpaid'
        const paymentMethod = order.paymentMethod || 'counter'

        accumulator.totalOrders += 1
        accumulator.totalItems += (order.items || []).reduce(
          (itemCount, item) => itemCount + Number(item.quantity || 0),
          0,
        )
        accumulator.byStatus[order.status] = (accumulator.byStatus[order.status] || 0) + 1
        accumulator.byPaymentMethod[paymentMethod] =
          (accumulator.byPaymentMethod[paymentMethod] || 0) + 1

        if (paymentStatus === 'paid') {
          accumulator.paidOrders += 1
          accumulator.paidIncome += totalPrice
        } else {
          accumulator.unpaidOrders += 1
          accumulator.unpaidAmount += totalPrice
        }

        return accumulator
      },
      {
        totalOrders: 0,
        totalItems: 0,
        paidOrders: 0,
        unpaidOrders: 0,
        paidIncome: 0,
        unpaidAmount: 0,
        byStatus: { pending: 0, preparing: 0, served: 0 },
        byPaymentMethod: { counter: 0, stripe: 0 },
      },
    )

    return successResponse(res, 200, 'Daily order report fetched successfully.', {
      date: startDate.toISOString(),
      summary,
      orders: orders.map(publicOrder),
    })
  } catch (error) {
    next(error)
  }
}

export async function handleStripeWebhook(req, res, next) {
  try {
    const signature = req.headers['stripe-signature']

    if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
      return errorResponse(res, 400, 'Stripe webhook signature is missing.', 'INVALID_WEBHOOK_SIGNATURE')
    }

    const stripe = getStripeClient()
    const event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    )

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const orderId = session.metadata?.orderId || session.client_reference_id
      const sessionId = session.id

      if (!orderId) {
        return res.status(200).json({ received: true })
      }

      const order = await findOrderById(orderId)
      if (!order) {
        return res.status(200).json({ received: true })
      }

      const updatedOrder = await updateOrderById(orderId, {
        paymentStatus: 'paid',
        paidAt: new Date(),
        stripeCheckoutSessionId: sessionId,
        stripePaymentIntentId: session.payment_intent || null,
      })

      await createAuditLog({
        actorUserId: null,
        actorRole: 'system',
        actorPhone: null,
        action: 'order.payment.stripe.completed',
        entityType: 'order',
        entityId: orderId,
        requestId: req.requestId,
        metadata: { sessionId },
      })

      if (order.paymentStatus !== 'paid') {
        void sendOrderNotificationEmail(updatedOrder).catch((error) => {
          logger.error('Failed to send Stripe order email', {
            message: error.message,
            orderId: updatedOrder._id?.toString?.(),
          })
        })
      }
    }

    return res.status(200).json({ received: true })
  } catch (error) {
    next(error)
  }
}
