import { describe, it, expect } from 'vitest'
import { maintenanceSchema } from '../lib/validators/maintenance'

describe('Maintenance validation', () => {
  it('accepts valid maintenance record', () => {
    const valid = { type: 'oil', date: new Date().toISOString().slice(0,10), name_garage: 'Joe', cost: 100, notes: 'ok' }
    expect(() => maintenanceSchema.parse(valid)).not.toThrow()
  })

  it('rejects future dates and negative costs', () => {
    const futureDate = { type: 'tire', date: '2999-01-01', cost: 50 }
    expect(() => maintenanceSchema.parse(futureDate)).toThrow()

    const negCost = { type: 'brake', date: new Date().toISOString().slice(0,10), cost: -5 }
    expect(() => maintenanceSchema.parse(negCost)).toThrow()
  })

  it('rejects an empty type', () => {
    const emptyType = { type: '', date: new Date().toISOString().slice(0,10), cost: 10 }
    expect(() => maintenanceSchema.parse(emptyType)).toThrow()
  })
})
