import { describe, it, expect } from 'vitest'
import { generateFamilyCode } from '../lib/utils'

describe('generateFamilyCode', () => {
  it('produces a non-empty code of the requested length', () => {
    const code = generateFamilyCode()
    expect(code).toBeTruthy()
    expect(code.length).toBe(8)

    const shortCode = generateFamilyCode(4)
    expect(shortCode.length).toBe(4)
  })

  it('only uses the intended, unambiguous character set', () => {
    const code = generateFamilyCode(50)
    expect(code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]+$/)
  })

  it('is sufficiently unique across many generations', () => {
    const codes = new Set(Array.from({ length: 1000 }, () => generateFamilyCode()))
    // 8 chars from a 31-symbol alphabet gives ~8.5e11 possibilities, so 1000
    // draws colliding would indicate a broken generator, not bad luck.
    expect(codes.size).toBe(1000)
  })
})
