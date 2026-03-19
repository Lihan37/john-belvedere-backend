import { getCollection, toObjectId, isValidObjectId } from '../config/db.js'

const collectionName = 'orders'

function orders() {
  return getCollection(collectionName)
}

export async function createOrderRecord(data) {
  const now = new Date()
  const document = {
    paymentStatus: 'unpaid',
    paymentMethod: 'counter',
    status: 'pending',
    ...data,
    customerId: data.customerId && isValidObjectId(data.customerId) ? toObjectId(data.customerId) : null,
    items: (data.items || []).map((item) => ({
      ...item,
      menuItemId: item.menuItemId && isValidObjectId(item.menuItemId) ? toObjectId(item.menuItemId) : null,
    })),
    createdAt: now,
    updatedAt: now,
  }
  const result = await orders().insertOne(document)
  return { ...document, _id: result.insertedId }
}

export async function findAllOrders() {
  return orders().find({}).sort({ createdAt: -1 }).toArray()
}

export async function findOrdersByCustomerId(customerId) {
  return orders()
    .find({ customerId: toObjectId(customerId) })
    .sort({ createdAt: -1 })
    .toArray()
}

export async function updateOrderStatusById(id, status) {
  await orders().findOneAndUpdate(
    { _id: toObjectId(id) },
    { $set: { status, updatedAt: new Date() } },
    { returnDocument: 'after' },
  )
  return orders().findOne({ _id: toObjectId(id) })
}
