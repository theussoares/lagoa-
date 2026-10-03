import { describe, expect, it } from 'vitest'
import { READABLE_CODE_ALPHABET } from '#shared/constants/domain'
import { generateReadableCode } from './readable-code'

describe('generateReadableCode', () => {
  it('has the requested length and only readable characters', () => {
    const code = generateReadableCode(200)
    expect(code).toHaveLength(200)
    expect([...code].every((char) => READABLE_CODE_ALPHABET.includes(char))).toBe(true)
  })

  it('does not repeat between calls', () => {
    expect(generateReadableCode(8)).not.toBe(generateReadableCode(8))
  })
})
