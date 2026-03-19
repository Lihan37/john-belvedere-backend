import { getCollection, toObjectId } from '../config/db.js'

const collectionName = 'users'

function users() {
  return getCollection(collectionName)
}

export async function findUserById(id, options = {}) {
  if (!id) return null
  return users().findOne(
    { _id: toObjectId(id) },
    options.projection ? { projection: options.projection } : undefined,
  )
}

export async function findUserByEmailOrPhone({ email, phone }) {
  const clauses = [
    ...(email ? [{ email }] : []),
    ...(phone ? [{ phone }] : []),
  ]

  if (!clauses.length) return null
  return users().findOne({ $or: clauses })
}

export async function createUser(data) {
  const now = new Date()
  const document = { ...data, createdAt: now, updatedAt: now }
  const result = await users().insertOne(document)
  return { ...document, _id: result.insertedId }
}

export async function updateUserById(id, updates) {
  const nextUpdates = { ...updates, updatedAt: new Date() }
  await users().updateOne({ _id: toObjectId(id) }, { $set: nextUpdates })
  return findUserById(id)
}
