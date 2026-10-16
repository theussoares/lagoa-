import { describe, expect, it } from 'vitest'
import { truncateCodePoints } from './truncate'

describe('truncateCodePoints', () => {
  it('keeps short text as is', () => {
    expect(truncateCodePoints('Oi', 5)).toBe('Oi')
  })
  it('cuts by code point, never leaving half of an emoji', () => {
    expect(truncateCodePoints('ab😀cd', 3)).toBe('ab😀')
    expect(truncateCodePoints('😀😀😀', 2)).toBe('😀😀')
  })
})
