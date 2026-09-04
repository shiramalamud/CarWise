import { describe, it, expect } from 'vitest'
import { canAccessCar } from '../lib/utils/permissions'

describe('Permissions helper', () => {
  it('allows access when family ids match', () => {
    const car = { id_family: 'fam-1' }
    const profile = { family_id: 'fam-1' }
    expect(canAccessCar(car as any, profile as any)).toBe(true)
  })

  it('denies access when family ids differ or profile missing', () => {
    const car = { id_family: 'fam-1' }
    const profile = { family_id: 'fam-2' }
    expect(canAccessCar(car as any, profile as any)).toBe(false)
    expect(canAccessCar(car as any, null)).toBe(false)
  })
})
