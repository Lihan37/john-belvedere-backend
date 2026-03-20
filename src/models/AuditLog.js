import { getCollection, toObjectId, isValidObjectId } from '../config/db.js'

const collectionName = 'auditLogs'

function auditLogs() {
  return getCollection(collectionName)
}

export async function createAuditLog(data) {
  const document = {
    actorUserId: data.actorUserId && isValidObjectId(data.actorUserId) ? toObjectId(data.actorUserId) : null,
    action: data.action,
    entityType: data.entityType,
    entityId: data.entityId || null,
    actorRole: data.actorRole || 'customer',
    actorPhone: data.actorPhone || '',
    metadata: data.metadata || {},
    requestId: data.requestId || null,
    createdAt: new Date(),
  }

  const result = await auditLogs().insertOne(document)
  return { ...document, _id: result.insertedId }
}
