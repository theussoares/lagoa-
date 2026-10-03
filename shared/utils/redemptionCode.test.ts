import { describe, expect, it } from 'vitest'
import { parseRedemptionCode } from './redemptionCode'

describe('parseRedemptionCode', () => {
  it('normalizes case and spacing typed at the counter', () => {
    const result = parseRedemptionCode('ac3 k9x')
    expect(result.ok && result.value).toBe('AC3K9X')
  })

  it.each(['AC3K9', 'AC3K9XY', 'AC0K9X', 'ACIK9X'])('rejects %s', (input) => {
    expect(parseRedemptionCode(input).ok).toBe(false)
  })

  it.each([
    ['AB3K9X', 'A83K9X'],
    ['AS3K9X', 'A53K9X'],
    ['AZ3K9X', 'A23K9X'],
    ['AU3K9X', 'AV3K9X'],
  ])('reads %s as %s: the lookalike becomes the character in the alphabet', (input, code) => {
    const result = parseRedemptionCode(input)
    expect(result.ok && result.value).toBe(code)
  })
})
