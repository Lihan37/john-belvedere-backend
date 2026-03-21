import { getCollection, toObjectId } from '../config/db.js'
import { normalizeText } from '../utils/helpers.js'

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
  const sanitizedUpdates = Object.fromEntries(
    Object.entries(updates || {}).filter(([key, value]) => key && value !== undefined),
  )
  const nextUpdates = { ...sanitizedUpdates, updatedAt: new Date() }
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

function buildMenuKey(item) {
  return `${normalizeText(item.category).toLowerCase()}::${normalizeText(item.name).toLowerCase()}`
}

export async function syncMenuItems(items) {
  const now = new Date()
  const collection = menuItems()
  const existingItems = await collection.find({}).toArray()
  const existingByKey = new Map(existingItems.map((item) => [buildMenuKey(item), item]))
  const incomingKeys = new Set()

  let insertedCount = 0
  let updatedCount = 0
  let disabledCount = 0

  for (const item of items) {
    const key = buildMenuKey(item)
    incomingKeys.add(key)
    const existing = existingByKey.get(key)
    const nextDocument = {
      ...item,
      image: item.image || '',
      isAvailable: true,
      updatedAt: now,
    }

    if (existing) {
      await collection.updateOne(
        { _id: existing._id },
        { $set: nextDocument, $setOnInsert: { createdAt: existing.createdAt || now } },
      )
      updatedCount += 1
    } else {
      await collection.insertOne({ ...nextDocument, createdAt: now })
      insertedCount += 1
    }
  }

  for (const existing of existingItems) {
    const key = buildMenuKey(existing)
    if (incomingKeys.has(key) || existing.isAvailable === false) {
      continue
    }

    await collection.updateOne(
      { _id: existing._id },
      { $set: { isAvailable: false, updatedAt: now } },
    )
    disabledCount += 1
  }

  return { insertedCount, updatedCount, disabledCount }
}
