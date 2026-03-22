import { getCollection, toObjectId, isValidObjectId } from '../config/db.js'

const collectionName = 'stripeCheckoutSessions'

function stripeCheckoutSessions() {
  return getCollection(collectionName)
}

function normalizeCustomerId(customerId) {
  return customerId && isValidObjectId(customerId) ? toObjectId(customerId) : null
}

export async function createStripeCheckoutSessionRecord(data) {
  const now = new Date()
  const document = {
    status: 'pending',
    ...data,
    customerId: normalizeCustomerId(data.customerId),
    orderId: data.orderId && isValidObjectId(data.orderId) ? toObjectId(data.orderId) : null,
    createdAt: now,
    updatedAt: now,
  }

  const result = await stripeCheckoutSessions().insertOne(document)
  return { ...document, _id: result.insertedId }
}

export async function updateStripeCheckoutSessionById(id, updates) {
  const nextUpdates = {
    ...updates,
    updatedAt: new Date(),
  }

  if ('orderId' in nextUpdates) {
    nextUpdates.orderId = normalizeCustomerId(nextUpdates.orderId)
  }

  await stripeCheckoutSessions().findOneAndUpdate(
    { _id: toObjectId(id) },
    { $set: nextUpdates },
    { returnDocument: 'after' },
  )

  return stripeCheckoutSessions().findOne({ _id: toObjectId(id) })
}

export async function findStripeCheckoutSessionBySessionId(sessionId) {
  return stripeCheckoutSessions().findOne({ stripeCheckoutSessionId: sessionId })
}
