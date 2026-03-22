import { Resend } from 'resend'
import { logger } from '../utils/logger.js'

function getResendConfig() {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM

  if (!apiKey || !from) {
    return null
  }

  return { apiKey, from }
}

export function getAdminEmails() {
  return (process.env.ADMIN_EMAILS || '')
    .split(/[,\s\n]+/)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

function formatMoney(value) {
  return `${Number(value || 0).toFixed(2)} AUD`
}

function buildOrderEmailText(order) {
  const items = (order.items || [])
    .map(
      (item) =>
        `- ${item.name} x${item.quantity} @ ${formatMoney(item.price)} = ${formatMoney(
          Number(item.price || 0) * Number(item.quantity || 0),
        )}`,
    )
    .join('\n')

  return [
    `Order ID: ${order._id?.toString?.() || order._id || 'unknown'}`,
    `Customer: ${order.customerName || 'Guest'}`,
    `Email: ${order.customerEmail || 'n/a'}`,
    `Phone: ${order.customerPhone || 'n/a'}`,
    `Payment method: ${order.paymentMethod === 'stripe' ? 'Stripe' : 'Counter cash'}`,
    `Payment status: ${order.paymentStatus || 'unpaid'}`,
    `Order status: ${order.status || 'pending'}`,
    `Total: ${formatMoney(order.totalPrice)}`,
    '',
    'Items:',
    items || '- No items',
  ].join('\n')
}

export async function sendOrderNotificationEmail(order) {
  const adminEmails = getAdminEmails()
  if (!adminEmails.length) {
    logger.warn('Order email skipped because ADMIN_EMAILS is empty.')
    return
  }

  const resendConfig = getResendConfig()
  if (!resendConfig) {
    logger.warn('Order email skipped because Resend is not configured.')
    return
  }

  const resend = new Resend(resendConfig.apiKey)
  const paymentLabel =
    order.paymentMethod === 'stripe'
      ? order.paymentStatus === 'paid'
        ? 'Stripe paid'
        : 'Stripe pending'
      : 'Counter payment'

  await resend.emails.send({
    from: resendConfig.from,
    to: adminEmails,
    subject: `New order received (#${String(order._id).slice(0, 6)}) - ${paymentLabel}`,
    text: buildOrderEmailText(order),
  })
}
