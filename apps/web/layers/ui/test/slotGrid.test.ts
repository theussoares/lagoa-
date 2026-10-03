import { describe, expect, it } from 'vitest'
import { slotColumns, slotGridStyle } from '../app/utils/slotGrid'

describe('slotColumns', () => {
  it.each([
    [10, 5],
    [8, 4],
    [6, 3],
    [12, 4],
    [20, 5],
    [4, 4],
    [7, 4],
  ])('lays %i slots in rows of %i', (total, columns) => {
    expect(slotColumns(total, 5)).toBe(columns)
  })

  it('keeps a single row when everything fits', () => {
    expect(slotColumns(8, 10)).toBe(8)
    expect(slotColumns(12, 10)).toBe(6)
  })

  it('falls back to a full row for an empty card', () => {
    expect(slotColumns(0, 5)).toBe(5)
  })
})

describe('slotGridStyle', () => {
  it('narrows the grid so each slot keeps the full-row size', () => {
    expect(slotGridStyle(8, 5, '0.75rem')).toEqual({
      gap: '0.75rem',
      gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
      width: 'calc((100% - 4 * 0.75rem) * 4 / 5 + 3 * 0.75rem)',
    })
  })
})
