import { getAllowedAdminPhones, sanitizePhone, errorResponse } from '../utils/helpers.js'

export function requireAdmin(req, res, next) {
  const allowedPhones = getAllowedAdminPhones()
  const userPhone = sanitizePhone(req.user?.phone || '')

  if (req.user?.role !== 'admin' || !allowedPhones.includes(userPhone)) {
    return errorResponse(res, 403, 'Admin access only.', 'ADMIN_ONLY')
  }

  next()
}
