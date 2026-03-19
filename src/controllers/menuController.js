import { matchedData } from 'express-validator'
import {
  createMenuItem as createMenuItemRecord,
  deleteMenuItemById,
  findAvailableMenuItems,
  updateMenuItemById,
} from '../models/MenuItem.js'
import { errorResponse, successResponse } from '../utils/helpers.js'

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
    return successResponse(res, 201, 'Menu item created successfully.', menuItem)
  } catch (error) {
    next(error)
  }
}

export async function updateMenuItem(req, res, next) {
  try {
    const data = matchedData(req, { locations: ['body'] })
    const menuItem = await updateMenuItemById(req.params.id, data)
    if (!menuItem) {
      return errorResponse(res, 404, 'Menu item not found.', 'MENU_ITEM_NOT_FOUND')
    }
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
    return successResponse(res, 200, 'Menu item deleted successfully.', null)
  } catch (error) {
    next(error)
  }
}
