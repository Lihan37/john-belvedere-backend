import { matchedData } from 'express-validator'
import { isValidObjectId } from '../config/db.js'
import {
  createOrderRecord,
  findAllOrders,
  findOrdersByCustomerId,
  updateOrderStatusById,
} from '../models/Order.js'
import {
  calculateOrderTotal,
  errorResponse,
  successResponse,
} from '../utils/helpers.js'

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
    return successResponse(res, 201, 'Order created successfully.', order)
  } catch (error) {
    next(error)
  }
}

export async function getOrders(req, res, next) {
  try {
    const orders = await findAllOrders()
    return successResponse(res, 200, 'Orders fetched successfully.', orders)
  } catch (error) {
    next(error)
  }
}

export async function getMyOrders(req, res, next) {
  try {
    const orders = await findOrdersByCustomerId(req.user._id)
    return successResponse(res, 200, 'Customer orders fetched successfully.', orders)
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

    return successResponse(res, 200, 'Order status updated successfully.', order)
  } catch (error) {
    next(error)
  }
}
