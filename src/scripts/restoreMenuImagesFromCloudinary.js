import dotenv from 'dotenv'
import { connectDB, getCollection } from '../config/db.js'
import { normalizeText } from '../utils/helpers.js'

dotenv.config()

const cloudName = process.env.CLOUDINARY_CLOUD_NAME
const apiKey = process.env.CLOUDINARY_API_KEY
const apiSecret = process.env.CLOUDINARY_API_SECRET
const folder = process.env.CLOUDINARY_FOLDER || 'john-belvedere/menu-items'

function requireConfig(value, key) {
  if (!value) {
    throw new Error(`${key} is required to restore menu images.`)
  }
}

function normalizeKey(value = '') {
  return normalizeText(value)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '')
}

function buildResourceKeys(resource) {
  const basename = resource.public_id?.split('/').pop() || ''
  return new Set([
    normalizeKey(resource.original_filename || ''),
    normalizeKey(basename),
    normalizeKey(resource.display_name || ''),
  ].filter(Boolean))
}

async function fetchCloudinaryResources() {
  const resources = []
  let nextCursor = ''

  do {
    const url = new URL(`https://api.cloudinary.com/v1_1/${cloudName}/resources/image/upload`)
    url.searchParams.set('prefix', folder)
    url.searchParams.set('max_results', '500')
    if (nextCursor) {
      url.searchParams.set('next_cursor', nextCursor)
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}`,
      },
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Cloudinary resource fetch failed: ${response.status} ${body}`)
    }

    const body = await response.json()
    resources.push(...(body.resources || []))
    nextCursor = body.next_cursor || ''
  } while (nextCursor)

  return resources
}

async function run() {
  requireConfig(cloudName, 'CLOUDINARY_CLOUD_NAME')
  requireConfig(apiKey, 'CLOUDINARY_API_KEY')
  requireConfig(apiSecret, 'CLOUDINARY_API_SECRET')

  await connectDB()

  const resources = await fetchCloudinaryResources()
  const resourcesByKey = new Map()

  for (const resource of resources) {
    for (const key of buildResourceKeys(resource)) {
      if (!resourcesByKey.has(key)) {
        resourcesByKey.set(key, [])
      }
      resourcesByKey.get(key).push(resource)
    }
  }

  const collection = getCollection('menuItems')
  const menuItems = await collection.find({ $or: [{ image: '' }, { image: { $exists: false } }] }).toArray()

  let updatedCount = 0
  let unmatchedCount = 0
  const unmatchedNames = []

  for (const item of menuItems) {
    const key = normalizeKey(item.name)
    const matches = resourcesByKey.get(key) || []

    if (matches.length === 1) {
      await collection.updateOne(
        { _id: item._id },
        { $set: { image: matches[0].secure_url, updatedAt: new Date() } },
      )
      updatedCount += 1
      continue
    }

    unmatchedCount += 1
    unmatchedNames.push(item.name)
  }

  console.log(
    `Menu image restore complete. updated=${updatedCount} unmatched=${unmatchedCount} resources=${resources.length}`,
  )

  if (unmatchedNames.length) {
    console.log('Unmatched items:')
    unmatchedNames.forEach((name) => console.log(`- ${name}`))
  }

  process.exit(0)
}

run().catch((error) => {
  console.error('Menu image restore failed:', error)
  process.exit(1)
})
