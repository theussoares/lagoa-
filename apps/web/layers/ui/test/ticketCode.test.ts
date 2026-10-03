import { describe, expect, it } from 'vitest'
import { charPosition, groupCode, spellCode } from '../app/utils/ticketCode'

describe('spellCode', () => {
  it('spells the code one character at a time', () => {
    expect(spellCode('K7M4PX')).toBe('K 7 M 4 P X')
  })

  it('returns an empty string for an empty code', () => {
    expect(spellCode('')).toBe('')
  })
})

describe('groupCode', () => {
  it('splits a 6-character code into two groups of 3', () => {
    expect(groupCode('K7M4PX')).toEqual(['K7M', '4PX'])
  })

  it('keeps a short code in the first group', () => {
    expect(groupCode('AB')).toEqual(['AB', ''])
  })
})

describe('charPosition', () => {
  it('numbers characters across groups from left to right', () => {
    expect(charPosition(0, 0)).toBe(0)
    expect(charPosition(0, 2)).toBe(2)
    expect(charPosition(1, 0)).toBe(3)
    expect(charPosition(1, 2)).toBe(5)
  })
})
