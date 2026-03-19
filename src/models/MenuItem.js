import { getCollection, toObjectId } from '../config/db.js'

const collectionName = 'menuItems'

function menuItems() {
  return getCollection(collectionName)
}

export async function findAvailableMenuItems() {
  return menuItems()
    .find({ isAvailable: true })
    .sort({ category: 1, createdAt: -1 })
    .toArray()
}

export async function createMenuItem(data) {
  const now = new Date()
  const document = { isAvailable: true, ...data, createdAt: now, updatedAt: now }
  const result = await menuItems().insertOne(document)
  return { ...document, _id: result.insertedId }
}

export async function updateMenuItemById(id, updates) {
  const nextUpdates = { ...updates, updatedAt: new Date() }
  await menuItems().findOneAndUpdate(
    { _id: toObjectId(id) },
    { $set: nextUpdates },
    { returnDocument: 'after' },
  )
  return menuItems().findOne({ _id: toObjectId(id) })
}

export async function deleteMenuItemById(id) {
  return menuItems().deleteOne({ _id: toObjectId(id) })
}

export async function countMenuItems() {
  return menuItems().countDocuments()
}

export async function insertMenuItems(items) {
  const now = new Date()
  const documents = items.map((item) => ({
    isAvailable: true,
    ...item,
    createdAt: now,
    updatedAt: now,
  }))
  return menuItems().insertMany(documents)
}
