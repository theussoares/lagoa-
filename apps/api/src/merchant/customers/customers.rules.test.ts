import { describe, expect, it } from 'vitest'
import { pageOf } from './customers.rules'

const rows = (count: number) => Array.from({ length: count }, (_, index) => ({ customerId: `c${index + 1}` }))

describe('pageOf', () => {
  it('has no next page when the extra row did not come', () => {
    expect(pageOf(rows(2), 2)).toEqual({ items: rows(2), nextCursor: null })
    expect(pageOf([], 2)).toEqual({ items: [], nextCursor: null })
  })

  it('drops the extra row and points the cursor at the last row shown', () => {
    expect(pageOf(rows(3), 2)).toEqual({ items: rows(2), nextCursor: 'c2' })
  })
})
