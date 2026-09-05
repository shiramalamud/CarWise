import { describe, it, expect } from 'vitest'
import { carSchema } from '../lib/validators/car'

const currentYear = new Date().getFullYear()
const base = { make: 'Toyota', model: 'Corolla', plate_license: 'ABC-123', mileage: 15000 }

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

  it('accepts the year range boundaries (1980 and the current year)', () => {
    expect(() => carSchema.parse({ ...base, year: 1980 })).not.toThrow()
    expect(() => carSchema.parse({ ...base, year: currentYear })).not.toThrow()
  })

  it('rejects years just outside the 1980–current year range', () => {
    expect(() => carSchema.parse({ ...base, year: 1979 })).toThrow()
    expect(() => carSchema.parse({ ...base, year: currentYear + 1 })).toThrow()
  })

  it('rejects non-numeric mileage', () => {
    expect(() => carSchema.parse({ ...base, mileage: Number('not-a-number') })).toThrow()
  })
})
