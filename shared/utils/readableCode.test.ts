import { describe, expect, it } from 'vitest'
import { normalizeReadableCode } from './readableCode'

describe('normalizeReadableCode', () => {
  it('drops spacing and dashes and uppercases', () => {
    expect(normalizeReadableCode('nav-4k 7')).toBe('NAV4K7')
  })

  it('swaps a lookalike for the character that is in the alphabet', () => {
    expect(normalizeReadableCode('sbzu')).toBe('582V')
  })

  it('leaves 0/O and 1/I alone: both sides are out of the alphabet', () => {
    expect(normalizeReadableCode('o0i1')).toBe('O0I1')
  })
})
