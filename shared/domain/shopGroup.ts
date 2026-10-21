import { z } from 'zod'
import type { ShopCategory } from '../schemas/shop'

/** Ramo: o filtro das telas do cliente. A loja escolhe a categoria; o ramo sai dela. */
export const ShopGroupSchema = z.enum(['food', 'beauty', 'clothing', 'services', 'pet'])
export type ShopGroup = z.infer<typeof ShopGroupSchema>

const GROUP_CATEGORIES: Record<ShopGroup, readonly ShopCategory[]> = {
  food: ['cafe', 'bakery', 'pizzeria', 'restaurant'],
  beauty: ['barbershop', 'beauty'],
  clothing: ['clothing'],
  services: ['services', 'gym', 'home', 'other'],
  pet: ['petShop'],
}

const GROUP_BY_CATEGORY: Record<ShopCategory, ShopGroup> = {
  cafe: 'food',
  bakery: 'food',
  pizzeria: 'food',
  restaurant: 'food',
  barbershop: 'beauty',
  beauty: 'beauty',
  clothing: 'clothing',
  services: 'services',
  gym: 'services',
  home: 'services',
  other: 'services',
  petShop: 'pet',
}

export function shopGroupOf(category: ShopCategory): ShopGroup {
  return GROUP_BY_CATEGORY[category]
}

export function categoriesOf(group: ShopGroup): readonly ShopCategory[] {
  return GROUP_CATEGORIES[group]
}
