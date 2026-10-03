import { describe, expect, it } from 'vitest'
import { BirthdaySchema } from './common'

describe('BirthdaySchema', () => {
  it.each(['01-01', '12-31', '02-29', '04-30'])('accepts %s', (value) => {
    expect(BirthdaySchema.safeParse(value).success).toBe(true)
  })

  it.each(['02-30', '04-31', '13-01', '00-10', '1-1'])('rejects %s', (value) => {
    expect(BirthdaySchema.safeParse(value).success).toBe(false)
  })
})
