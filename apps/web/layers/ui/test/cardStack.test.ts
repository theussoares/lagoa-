import { describe, expect, it } from 'vitest'
import { stackPeeks } from '../app/utils/cardStack'

const cards = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => ({ id }))

describe('stackPeeks', () => {
  it('puts the active card in front and keeps the others in order as peeks', () => {
    const stack = stackPeeks(cards, 'c', true, 3)
    expect(stack.active).toEqual({ id: 'c' })
    expect(stack.peeks.map((card) => card.id)).toEqual(['a', 'b', 'd', 'e', 'f'])
    expect(stack.hidden).toBe(0)
  })

  it('shows only the first peeks while collapsed and counts the rest as hidden', () => {
    const stack = stackPeeks(cards, 'a', false, 3)
    expect(stack.peeks.map((card) => card.id)).toEqual(['b', 'c', 'd'])
    expect(stack.hidden).toBe(2)
  })

  it('hides nothing when everything fits', () => {
    const stack = stackPeeks(cards.slice(0, 3), 'a', false, 3)
    expect(stack.peeks).toHaveLength(2)
    expect(stack.hidden).toBe(0)
  })

  it('falls back to the first card when the active id is unknown', () => {
    expect(stackPeeks(cards, 'missing', false, 3).active).toEqual({ id: 'a' })
  })

  it('handles an empty stack', () => {
    expect(stackPeeks([], 'a', false, 3)).toEqual({ active: undefined, peeks: [], hidden: 0 })
  })
})
