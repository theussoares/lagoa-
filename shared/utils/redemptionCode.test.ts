import { describe, expect, it } from 'vitest'
import { parseRedemptionCode } from './redemptionCode'

describe('parseRedemptionCode', () => {
  it('normalizes case and spacing typed at the counter', () => {
    const result = parseRedemptionCode('ab3 k9x')
    expect(result.ok && result.value).toBe('AB3K9X')
  })

  it.each(['AB3K9', 'AB3K9XY', 'AB0K9X', 'ABIK9X'])('rejects %s', (input) => {
    expect(parseRedemptionCode(input).ok).toBe(false)
  })
})
