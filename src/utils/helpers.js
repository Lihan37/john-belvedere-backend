import crypto from 'crypto'

export function sanitizePhone(value = '') {
  return String(value).replace(/[^\d+]/g, '')
}

export function normalizeText(value = '') {
  return String(value).trim().replace(/\s+/g, ' ')
}

export function normalizeEmail(value = '') {
  return normalizeText(value).toLowerCase()
}

export function normalizeTableNumber(value = '') {
  return normalizeText(value).toUpperCase()
}

export function roundPrice(value) {
  return Number(Number(value).toFixed(2))
}

export function calculateOrderTotal(items = []) {
  return roundPrice(
    items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0),
  )
}

export function getAllowedAdminPhones() {
  return (process.env.ALLOWED_ADMIN_PHONES || '')
    .split(',')
    .map((phone) => sanitizePhone(phone))
    .filter(Boolean)
}

export function buildAuthPayload(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email || '',
    phone: user.phone || '',
    role: user.role,
    createdAt: user.createdAt,
  }
}

export function successResponse(res, statusCode, message, data) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  })
}

export function errorResponse(res, statusCode, message, code = 'REQUEST_FAILED', extras = {}) {
  return res.status(statusCode).json({
    success: false,
    code,
    message,
    ...extras,
  })
}

export function publicOrder(order) {
  if (!order) return order
  return {
    ...order,
    _id: order._id?.toString?.() || order._id,
    customerId: order.customerId?.toString?.() || order.customerId || null,
    items: (order.items || []).map((item) => ({
      ...item,
      menuItemId: item.menuItemId?.toString?.() || item.menuItemId || null,
    })),
  }
}

export function buildCloudinarySignature(params = {}) {
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  if (!apiSecret) {
    throw new Error('CLOUDINARY_API_SECRET is not configured.')
  }

  const normalizedEntries = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([left], [right]) => left.localeCompare(right))

  const payload = normalizedEntries
    .map(([key, value]) => `${key}=${value}`)
    .join('&')

  return crypto.createHash('sha1').update(`${payload}${apiSecret}`).digest('hex')
}
