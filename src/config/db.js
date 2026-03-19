import { MongoClient, ObjectId } from 'mongodb'

let client
let database

function buildMongoUri() {
  if (process.env.MONGODB_URI) {
    return process.env.MONGODB_URI
  }

  const username = process.env.DB_USER
  const password = process.env.DB_PASS

  if (!username || !password) {
    throw new Error('Set MONGODB_URI or both DB_USER and DB_PASS.')
  }

  return `mongodb+srv://${encodeURIComponent(username)}:${encodeURIComponent(password)}@cluster0.g9xsrko.mongodb.net/john-belvedere-ordering?retryWrites=true&w=majority&appName=Cluster0`
}

export async function connectDB() {
  const uri = buildMongoUri()

  client = new MongoClient(uri)
  await client.connect()
  database = client.db()
  await Promise.all([
    database.collection('users').createIndex({ email: 1 }, { unique: true, sparse: true }),
    database.collection('users').createIndex({ phone: 1 }, { unique: true, sparse: true }),
  ])
  console.log('MongoDB connected')
}

export function getDb() {
  if (!database) {
    throw new Error('Database connection has not been initialized.')
  }

  return database
}

export function getCollection(name) {
  return getDb().collection(name)
}

export function toObjectId(value) {
  return value instanceof ObjectId ? value : new ObjectId(value)
}

export function isValidObjectId(value) {
  return ObjectId.isValid(value)
}
