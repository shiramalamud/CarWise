import { describe, it, expect } from 'vitest'
import { carSchema } from '../lib/validators/car'

describe('Car validation', () => {
  it('accepts valid car data', () => {
    const valid = { make: 'Toyota', model: 'Corolla', year: 2020, plate_license: 'ABC-123', mileage: 15000 }
    expect(() => carSchema.parse(valid)).not.toThrow()
  })

  it('rejects invalid year and negative mileage', () => {
    const badYear = { make: 'Ford', model: 'Fiesta', year: 1970, plate_license: 'XYZ-9', mileage: 100 }
    expect(() => carSchema.parse(badYear)).toThrow()

    const badMileage = { make: 'Mazda', model: '3', year: 2021, plate_license: 'MZ3-21', mileage: -10 }
    expect(() => carSchema.parse(badMileage)).toThrow()
  })
})
