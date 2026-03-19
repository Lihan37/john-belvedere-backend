import { matchedData } from 'express-validator'
import { isValidObjectId } from '../config/db.js'
import {
  createOrderRecord,
  findAllOrders,
  updateOrderStatusById,
} from '../models/Order.js'
import { successResponse } from '../utils/helpers.js'

export async function createOrder(req, res, next) {
  try {
    const data = matchedData(req, { locations: ['body'] })
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

export async function updateOrderStatus(req, res, next) {
  try {
    const { status } = matchedData(req, { locations: ['body'] })
    const order = await updateOrderStatusById(req.params.id, status)

    return successResponse(res, 200, 'Order status updated successfully.', order)
  } catch (error) {
    next(error)
  }
}
