import { matchedData } from 'express-validator'
import {
  createMenuItem as createMenuItemRecord,
  deleteMenuItemById,
  findAvailableMenuItems,
  updateMenuItemById,
} from '../models/MenuItem.js'
import { buildCloudinarySignature, errorResponse, successResponse } from '../utils/helpers.js'
import { createAuditLog } from '../models/AuditLog.js'

export async function getMenu(req, res, next) {
  try {
    const menuItems = await findAvailableMenuItems()
    return successResponse(res, 200, 'Menu fetched successfully.', menuItems)
  } catch (error) {
    next(error)
  }
}

export async function createMenuItem(req, res, next) {
  try {
    const data = matchedData(req, { locations: ['body'] })
    const menuItem = await createMenuItemRecord(data)
    await createAuditLog({
      actorUserId: req.user?._id,
      actorRole: req.user?.role,
      actorPhone: req.user?.phone,
      action: 'menu.item.created',
      entityType: 'menuItem',
      entityId: menuItem._id?.toString?.(),
      requestId: req.requestId,
      metadata: { name: menuItem.name, category: menuItem.category },
    })
    return successResponse(res, 201, 'Menu item created successfully.', menuItem)
  } catch (error) {
    next(error)
  }
}

export async function updateMenuItem(req, res, next) {
  try {
    const data = Object.fromEntries(
      Object.entries(matchedData(req, { locations: ['body'] })).filter(([key]) => key),
    )
    const menuItem = await updateMenuItemById(req.params.id, data)
    if (!menuItem) {
      return errorResponse(res, 404, 'Menu item not found.', 'MENU_ITEM_NOT_FOUND')
    }
    await createAuditLog({
      actorUserId: req.user?._id,
      actorRole: req.user?.role,
      actorPhone: req.user?.phone,
      action: 'menu.item.updated',
      entityType: 'menuItem',
      entityId: req.params.id,
      requestId: req.requestId,
      metadata: data,
    })
    return successResponse(res, 200, 'Menu item updated successfully.', menuItem)
  } catch (error) {
    next(error)
  }
}

export async function deleteMenuItem(req, res, next) {
  try {
    const result = await deleteMenuItemById(req.params.id)
    if (!result.deletedCount) {
      return errorResponse(res, 404, 'Menu item not found.', 'MENU_ITEM_NOT_FOUND')
    }
    await createAuditLog({
      actorUserId: req.user?._id,
      actorRole: req.user?.role,
      actorPhone: req.user?.phone,
      action: 'menu.item.deleted',
      entityType: 'menuItem',
      entityId: req.params.id,
      requestId: req.requestId,
    })
    return successResponse(res, 200, 'Menu item deleted successfully.', null)
  } catch (error) {
    next(error)
  }
}

export async function getMenuUploadSignature(req, res, next) {
  try {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim()
    const apiKey = process.env.CLOUDINARY_API_KEY
    const folder = process.env.CLOUDINARY_FOLDER || 'john-belvedere/menu-items'

    if (!cloudName || !apiKey || !process.env.CLOUDINARY_API_SECRET) {
      return errorResponse(
        res,
        500,
        'Cloudinary upload is not configured yet.',
        'CLOUDINARY_NOT_CONFIGURED',
      )
    }

    if (!/^[a-z0-9_-]+$/i.test(cloudName)) {
      return errorResponse(
        res,
        500,
        'Cloudinary cloud name is invalid. Update CLOUDINARY_CLOUD_NAME to the exact value from the Cloudinary dashboard.',
        'CLOUDINARY_INVALID_CLOUD_NAME',
      )
    }

    const timestamp = Math.floor(Date.now() / 1000)
    const signature = buildCloudinarySignature({ folder, timestamp })

    return successResponse(res, 200, 'Cloudinary signature generated.', {
      cloudName,
      apiKey,
      folder,
      timestamp,
      signature,
    })
  } catch (error) {
    next(error)
  }
}
