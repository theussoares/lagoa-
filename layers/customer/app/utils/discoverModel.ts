import { PILOT_CITY } from '#shared/constants/domain'
import type { Challenge } from '#shared/schemas/discover'
import type { ShopSummary } from '#shared/schemas/shop'
import type { ChallengeModel, KnownShopModel, ShopPreview, ShopTeaserModel } from '#layers/ui/app/types/discover'
import type { Translate } from '#layers/core/app/utils/translate'
import { stampTilt } from '#layers/ui/app/utils/stampTilt'
import { categoryIcon } from './categoryIcon'

/** Acima disso as casas de exemplo não cabem numa linha de 390px. */
const MAX_PREVIEW_SLOTS = 12

export interface ShopGroups {
  /** Lojas onde a pessoa ainda não tem cartão. */
  readonly fresh: readonly ShopSummary[]
  readonly known: readonly ShopSummary[]
}

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

const MAP_SEARCH_URL = 'https://www.google.com/maps/search/?api=1'

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
