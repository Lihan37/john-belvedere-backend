import test from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateOrderTotal,
  normalizeEmail,
  normalizeTableNumber,
  normalizeText,
  publicOrder,
  roundPrice,
  sanitizePhone,
} from '../src/utils/helpers.js'

test('normalizeText collapses whitespace', () => {
  assert.equal(normalizeText('  John   Belvedere  '), 'John Belvedere')
})

test('normalizeEmail lowercases and trims', () => {
  assert.equal(normalizeEmail('  TEST@Example.COM '), 'test@example.com')
})

test('normalizeTableNumber uppercases and trims', () => {
  assert.equal(normalizeTableNumber(' t12 '), 'T12')
})

test('sanitizePhone strips invalid characters', () => {
  assert.equal(sanitizePhone(' +880-1716 285196 '), '+8801716285196')
})

test('roundPrice rounds to two decimals', () => {
  assert.equal(roundPrice(123.456), 123.46)
})

test('calculateOrderTotal sums line items safely', () => {
  assert.equal(
    calculateOrderTotal([
      { price: 100.125, quantity: 2 },
      { price: 49.5, quantity: 1 },
    ]),
    249.75,
  )
})

test('publicOrder serializes object ids when present', () => {
  const order = {
    _id: { toString: () => 'order123' },
    customerId: { toString: () => 'customer123' },
    items: [{ menuItemId: { toString: () => 'menu123' }, name: 'Burger' }],
  }

  assert.deepEqual(publicOrder(order), {
    _id: 'order123',
    customerId: 'customer123',
    items: [{ menuItemId: 'menu123', name: 'Burger' }],
  })
})
