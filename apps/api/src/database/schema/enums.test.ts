import { describe, expect, it } from 'vitest'
import { ShopCategorySchema, ShopStatusSchema } from '#shared/schemas/shop'
import { shopCategory, shopStatus } from './enums'

describe('db enums stay in sync with shared schemas', () => {
  it('shop category', () => expect(shopCategory.enumValues).toEqual(ShopCategorySchema.options))
  it('shop status', () => expect(shopStatus.enumValues).toEqual(ShopStatusSchema.options))
})
