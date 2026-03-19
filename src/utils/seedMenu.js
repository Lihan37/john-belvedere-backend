import { countMenuItems, insertMenuItems } from '../models/MenuItem.js'

const defaultMenuItems = [
  {
    name: 'Belvedere Smash Burger',
    price: 540,
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80',
    category: 'Burgers',
    description: 'Double beef patty, cheddar, caramelized onion and house sauce.',
  },
  {
    name: 'Truffle Alfredo Pasta',
    price: 620,
    image: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=900&q=80',
    category: 'Pasta',
    description: 'Creamy parmesan Alfredo with truffle aroma and roasted mushrooms.',
  },
  {
    name: 'Mango Sparkler',
    price: 250,
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=900&q=80',
    category: 'Drinks',
    description: 'Fresh mango, soda and mint served chilled.',
  },
]

export async function seedMenuIfEmpty() {
  const existingCount = await countMenuItems()

  if (existingCount > 0) {
    return
  }

  await insertMenuItems(defaultMenuItems)
  console.log('Default menu seeded')
}
