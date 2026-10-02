import type { ShopCategory } from '#shared/schemas/shop'

/** Ícone da impressão de carimbo por ramo da loja (Phosphor bold, MASTER.md). */
const CATEGORY_ICONS: Record<ShopCategory, string> = {
  barbershop: 'i-ph-scissors-bold',
  beauty: 'i-ph-sparkle-bold',
  cafe: 'i-ph-coffee-bold',
  bakery: 'i-ph-bread-bold',
  pizzeria: 'i-ph-pizza-bold',
  restaurant: 'i-ph-fork-knife-bold',
  petShop: 'i-ph-paw-print-bold',
  gym: 'i-ph-barbell-bold',
  other: 'i-ph-storefront-bold',
}

export function categoryIcon(category: ShopCategory): string {
  return CATEGORY_ICONS[category]
}
