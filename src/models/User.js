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

export async function findUserByResetTokenHash(resetPasswordTokenHash) {
  return users().findOne({
    resetPasswordTokenHash,
    resetPasswordExpiresAt: { $gt: new Date() },
  })
}

export async function findAllUsers(options = {}) {
  return users()
    .find(
      {},
      options.projection ? { projection: options.projection } : undefined,
    )
    .sort({ createdAt: -1 })
    .toArray()
}

export async function findUsersPage({ page = 1, limit = 50, search = '', projection } = {}) {
  const normalizedSearch = String(search || '').trim()
  const filter = normalizedSearch
    ? {
        $or: [
          { name: { $regex: normalizedSearch, $options: 'i' } },
          { email: { $regex: normalizedSearch, $options: 'i' } },
          { phone: { $regex: normalizedSearch, $options: 'i' } },
          { role: { $regex: normalizedSearch, $options: 'i' } },
        ],
      }
    : {}

  const [items, total] = await Promise.all([
    users()
      .find(filter, projection ? { projection } : undefined)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
    users().countDocuments(filter),
  ])

  return { items, total }
}

export async function countUsersByRole(role) {
  return users().countDocuments({ role })
}

export async function countAllUsers() {
  return users().countDocuments()
}
