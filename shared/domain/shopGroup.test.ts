import { describe, expect, it } from 'vitest'
import { ShopCategorySchema } from '../schemas/shop'
import { categoriesOf, shopGroupOf } from './shopGroup'

describe('shopGroupOf', () => {
  it.each([
    ['pizzeria', 'food'],
    ['barbershop', 'beauty'],
    ['clothing', 'clothing'],
    ['gym', 'services'],
    ['home', 'services'],
    ['other', 'services'],
    ['petShop', 'pet'],
  ] as const)('maps %s to %s', (category, group) => {
    expect(shopGroupOf(category)).toBe(group)
  })

  it('puts every category in exactly one group', () => {
    for (const category of ShopCategorySchema.options) {
      const groups = (['food', 'beauty', 'clothing', 'services', 'pet'] as const).filter((group) =>
        categoriesOf(group).includes(category),
      )
      expect(groups).toEqual([shopGroupOf(category)])
    }
  })
})
