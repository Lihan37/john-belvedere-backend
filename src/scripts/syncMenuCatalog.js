import dotenv from 'dotenv'
import { connectDB } from '../config/db.js'
import { syncMenuItems } from '../models/MenuItem.js'
import { menuCatalog } from '../data/menuCatalog.js'

dotenv.config()

async function run() {
  await connectDB()
  const result = await syncMenuItems(menuCatalog)
  console.log(
    `Menu sync complete. inserted=${result.insertedCount} updated=${result.updatedCount} disabled=${result.disabledCount}`,
  )
  process.exit(0)
}

run().catch((error) => {
  console.error('Menu sync failed:', error)
  process.exit(1)
})
