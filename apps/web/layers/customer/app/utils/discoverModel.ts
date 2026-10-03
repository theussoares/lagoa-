import { PILOT_CITY } from '#shared/constants/domain'
import type { Challenge } from '#shared/schemas/discover'
import type { ShopSummary } from '#shared/schemas/shop'
import type { ChallengeModel, KnownShopModel, ShopPreview, ShopShowcaseModel, ShopTeaserModel } from '#layers/ui/app/types/discover'
import type { Translate } from '#layers/core/app/types/i18n'
import { stampTilt } from '#layers/ui/app/utils/stampTilt'
import { categoryIcon } from './categoryIcon'
import type { ShopGroups } from '../types/discover'

/** Acima disso as casas de exemplo não cabem numa linha de 390px. */
const MAX_PREVIEW_SLOTS = 12

export function groupShops(shops: readonly ShopSummary[], walletShopIds: ReadonlySet<string>): ShopGroups {
  return {
    fresh: shops.filter((shop) => !walletShopIds.has(shop.id)),
    known: shops.filter((shop) => walletShopIds.has(shop.id)),
  }
}

/** Lojas que ainda contam em algum desafio aberto. */
export function pendingChallengeShopIds(challenges: readonly Challenge[]): Set<string> {
  return new Set(
    challenges
      .filter((challenge) => challenge.visitedShopIds.length < challenge.requiredVisits)
      .flatMap((challenge) => challenge.shopIds.filter((id) => !challenge.visitedShopIds.includes(id))),
  )
}

function ruleLine(shop: ShopSummary, t: Translate): string {
  const { unit, target, rewardTitle } = shop.program
  return t('discover.rule', { units: t(`units.${unit}`, {}, target), reward: rewardTitle })
}

const decimal = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

function showcaseModel(shop: ShopSummary, t: Translate): ShopShowcaseModel {
  const showcase = shop.showcase
  return {
    image: showcase?.imageUrl ?? null,
    rating: showcase?.rating === undefined ? null : decimal.format(showcase.rating),
    distance: showcase?.distanceKm === undefined ? null : t('discover.showcase.distance', { distance: decimal.format(showcase.distanceKm) }),
    openLabel: showcase?.openNow === true ? t('discover.showcase.openNow') : null,
  }
}

/** Mais perto primeiro; loja sem distância conhecida vai para o fim, na ordem original. */
export function sortByDistance(shops: readonly ShopSummary[]): ShopSummary[] {
  const distance = (shop: ShopSummary): number => shop.showcase?.distanceKm ?? Number.POSITIVE_INFINITY
  return [...shops].sort((a, b) => distance(a) - distance(b))
}

/** Busca por nome ou bairro, sem acento e sem diferenciar maiúscula. */
export function filterShops(shops: readonly ShopSummary[], query: string): ShopSummary[] {
  const needle = normalizeText(query)
  if (needle === '') return [...shops]
  return shops.filter((shop) => normalizeText(`${shop.name} ${shop.neighborhood}`).includes(needle))
}

function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
}

const MAP_SEARCH_URL = 'https://www.google.com/maps/search/?api=1'

/** Mapa com as lojas da rede da cidade piloto. */
export function shopsMapUrl(): string {
  return `${MAP_SEARCH_URL}&query=${encodeURIComponent(`lojas, ${PILOT_CITY}`)}`
}

/** Busca da loja no mapa: só nome e endereço públicos da loja, nada da pessoa. */
export function shopDirectionsUrl(shop: Pick<ShopSummary, 'name' | 'addressLine'>): string {
  const query = encodeURIComponent(`${shop.name}, ${shop.addressLine}, ${PILOT_CITY}`)
  return `${MAP_SEARCH_URL}&query=${query}`
}

function previewFor(shop: ShopSummary): ShopPreview {
  const { unit, target, welcomeUnits } = shop.program
  if (unit === 'stamp' && target <= MAX_PREVIEW_SLOTS) return { kind: 'slots', total: target, welcome: welcomeUnits }
  return { kind: 'ruler', fraction: Math.min(1, welcomeUnits / target) }
}

export function toShopTeaserModel(shop: ShopSummary, challengeShopIds: ReadonlySet<string>, t: Translate): ShopTeaserModel {
  const { unit, earnRate, welcomeUnits } = shop.program
  return {
    id: shop.id,
    shopName: shop.name,
    place: shop.addressLine,
    icon: categoryIcon(shop.category),
    tilt: stampTilt(shop.id),
    rule: ruleLine(shop, t),
    earn: t(`discover.earn.${earnRate.per}`, { units: t(`units.${unit}`, {}, earnRate.units) }),
    welcome: welcomeUnits > 0 ? t('discover.welcome', { units: t(`units.${unit}`, {}, welcomeUnits) }) : null,
    preview: previewFor(shop),
    tag: challengeShopIds.has(shop.id) ? t('discover.challengeTag') : null,
    showcase: showcaseModel(shop, t),
    directions: {
      label: t('discover.directions'),
      accessibleLabel: t('discover.directionsTo', { shop: shop.name }),
      href: shopDirectionsUrl(shop),
    },
  }
}

export function toKnownShopModel(shop: ShopSummary, t: Translate): KnownShopModel {
  return {
    id: shop.id,
    shopName: shop.name,
    icon: categoryIcon(shop.category),
    tilt: stampTilt(shop.id),
    rule: ruleLine(shop, t),
    showcase: showcaseModel(shop, t),
  }
}

export function toChallengeModel(
  challenge: Challenge,
  shopsById: ReadonlyMap<string, ShopSummary>,
  t: Translate,
  formatDate: (iso: string) => string,
): ChallengeModel {
  const visited = new Set<string>(challenge.visitedShopIds)
  const done = visited.size >= challenge.requiredVisits
  return {
    id: challenge.id,
    title: challenge.title,
    description: challenge.description,
    deadline: challenge.endsAt === null ? null : t('discover.challenge.deadline', { date: formatDate(challenge.endsAt) }),
    progress: t('discover.challenge.progress', { done: Math.min(visited.size, challenge.requiredVisits), total: challenge.requiredVisits }),
    done,
    stops: challenge.shopIds.flatMap((shopId) => {
      const shop = shopsById.get(shopId)
      if (shop === undefined) return []
      const isVisited = visited.has(shopId)
      return [
        {
          id: shopId,
          shopName: shop.name,
          icon: categoryIcon(shop.category),
          visited: isVisited,
          tilt: stampTilt(challenge.id + shopId),
          label: t(isVisited ? 'discover.challenge.stopVisited' : 'discover.challenge.stopPending', { shop: shop.name }),
        },
      ]
    }),
  }
}
