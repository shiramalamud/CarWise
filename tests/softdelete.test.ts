import { describe, it, expect } from 'vitest'

describe('Soft delete behavior', () => {
  it('marks car as sold and excludes from active list', () => {
    const cars = [
      { id: '1', status: 'active' },
      { id: '2', status: 'active' },
    ]

    // simulate marking car 1 as sold
    const updated = cars.map(c => c.id === '1' ? { ...c, status: 'sold' } : c)
    const active = updated.filter(c => c.status === 'active')

    expect(active.find(c => c.id === '1')).toBeUndefined()
    expect(active.length).toBe(1)
    expect(updated.find(c => c.id === '1')?.status).toBe('sold')
  })
})
