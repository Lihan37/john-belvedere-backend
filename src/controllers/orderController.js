import { matchedData } from 'express-validator'
import { isValidObjectId } from '../config/db.js'
import {
  createOrderRecord,
  findAllOrders,
  findOrdersInDateRange,
  findOrdersByCustomerId,
  updateOrderPaymentStatusById,
  updateOrderStatusById,
} from '../models/Order.js'
import {
  calculateOrderTotal,
  errorResponse,
  publicOrder,
  successResponse,
} from '../utils/helpers.js'
import { createAuditLog } from '../models/AuditLog.js'

export async function createOrder(req, res, next) {
  try {
    const data = matchedData(req, { locations: ['body'] })
    const computedTotal = calculateOrderTotal(data.items)
    if (computedTotal !== data.totalPrice) {
      return errorResponse(res, 422, 'Order total does not match item totals.', 'ORDER_TOTAL_MISMATCH', {
        expectedTotal: computedTotal,
      })
    }

    const payload = {
      ...data,
      customerId:
        req.user?._id || (data.customerId && isValidObjectId(data.customerId)
          ? data.customerId
          : null),
    }

    const order = await createOrderRecord(payload)
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
