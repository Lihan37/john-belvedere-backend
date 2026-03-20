import { countMenuItems, insertMenuItems } from '../models/MenuItem.js'
import { menuCatalog } from '../data/menuCatalog.js'

export async function seedMenuIfEmpty() {
  const existingCount = await countMenuItems()

  if (existingCount > 0) {
    return
  }

  await insertMenuItems(menuCatalog.map((item) => ({ ...item, image: item.image || '' })))
  console.log('Default menu seeded')
}
