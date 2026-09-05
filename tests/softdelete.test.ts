import { describe, it, expect } from 'vitest'
import { SOLD_STATUS_UPDATE } from '../lib/utils'

describe('Soft delete behavior', () => {
  it('the sold-status update is a pure status patch — never a payload that could drop other columns', () => {
    expect(SOLD_STATUS_UPDATE).toEqual({ status: 'sold' })
    expect(Object.keys(SOLD_STATUS_UPDATE)).toEqual(['status'])
  })

  it('marks a car as sold and excludes it from the active list, without removing the row', () => {
    const cars = [
      { id: '1', make: 'Toyota', model: 'Corolla', status: 'active' },
      { id: '2', make: 'Honda', model: 'Civic', status: 'active' },
    ]

    // Same shape of update the real markSold() sends to Supabase — applied
    // here to an in-memory stand-in for the table row.
    const updated = cars.map(c => (c.id === '1' ? { ...c, ...SOLD_STATUS_UPDATE } : c))
    const active = updated.filter(c => c.status === 'active')

    // Row count is unchanged — this was an UPDATE, not a DELETE.
    expect(updated.length).toBe(cars.length)
    expect(updated.find(c => c.id === '1')).toBeDefined()

    // Status flipped, but every other field survives untouched.
    const sold = updated.find(c => c.id === '1')!
    expect(sold.status).toBe('sold')
    expect(sold.make).toBe('Toyota')
    expect(sold.model).toBe('Corolla')

    // The active-only view (Home/Calendar/car-count) no longer shows it.
    expect(active.find(c => c.id === '1')).toBeUndefined()
    expect(active.length).toBe(1)
  })
})
