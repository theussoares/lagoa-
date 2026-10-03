import { describe, expect, it } from 'vitest'
import { describedBy } from '../app/utils/aria'

describe('describedBy', () => {
  it('joins the ids that exist with a space', () => {
    expect(describedBy(['hint-1', 'error-1'])).toBe('hint-1 error-1')
  })

  it('skips empty, false and missing ids', () => {
    expect(describedBy(['', false, undefined, null, 'error-1'])).toBe('error-1')
  })

  it('returns undefined when there is nothing to describe', () => {
    expect(describedBy([])).toBeUndefined()
    expect(describedBy(['', false])).toBeUndefined()
  })
})
