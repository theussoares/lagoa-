import { FEATURED_PAID_SLOTS_DISCOVER, FEATURED_PAID_SLOTS_HITS } from '#shared/constants/domain'
import type { FeaturedSurface } from '#shared/schemas/featured'
import type { HitItemStatus } from '#shared/schemas/hitItem'
import type { ShopStatus } from '#shared/schemas/shop'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import { addDays, localDateParts, localMidnight } from '#shared/utils/time'

/** Período pago, semiaberto `[startsAt, endsAt)`: quem termina às 10h não divide vaga com quem começa às 10h. */
export interface PlacementPeriod {
  readonly startsAt: Date
  readonly endsAt: Date
}

export function paidSlotsFor(surface: FeaturedSurface): number {
  return surface === 'discoverCarousel' ? FEATURED_PAID_SLOTS_DISCOVER : FEATURED_PAID_SLOTS_HITS
}

/** Maior número de períodos existentes vivos ao mesmo tempo em algum instante do candidato (varredura de eventos). */
export function peakOverlap(existing: readonly PlacementPeriod[], candidate: PlacementPeriod): number {
  const start = candidate.startsAt.getTime()
  const end = candidate.endsAt.getTime()
  const events: { at: number; delta: 1 | -1 }[] = []
  for (const period of existing) {
    const from = Math.max(period.startsAt.getTime(), start)
    const to = Math.min(period.endsAt.getTime(), end)
    if (from >= to) continue
    events.push({ at: from, delta: 1 }, { at: to, delta: -1 })
  }
  // No mesmo instante a saída vem antes da entrada: é o que faz o intervalo ser semiaberto.
  events.sort((a, b) => a.at - b.at || a.delta - b.delta)
  let live = 0
  let peak = 0
  for (const event of events) {
    live += event.delta
    peak = Math.max(peak, live)
  }
  return peak
}

export interface PlacementTarget {
  readonly candidate: PlacementPeriod
  /** Destaques não cancelados da mesma vitrine. Loja suspensa continua ocupando a vaga (pagou; o destaque só pausa). */
  readonly existing: readonly PlacementPeriod[]
  readonly surface: FeaturedSurface
  readonly shopStatus: ShopStatus
  /** Produto do banner; `null` no carrossel ou quando o id não existe. */
  readonly hitItem: { readonly status: HitItemStatus; readonly shopId: string } | null
  readonly shopId: string
}

export type PlacementError = ErrorOf<'slotsFull'> | ErrorOf<'invalidTarget'>

/** Destaque novo só para loja aprovada agora; o banner, só com produto aprovado da própria loja; e só com vaga em todo o período. */
export function planPlacement(input: PlacementTarget): Result<void, PlacementError> {
  if (input.shopStatus !== 'approved') return err({ code: 'invalidTarget' })
  if (input.surface === 'hitsBanner') {
    if (input.hitItem === null || input.hitItem.status !== 'approved' || input.hitItem.shopId !== input.shopId) return err({ code: 'invalidTarget' })
  }
  if (peakOverlap(input.existing, input.candidate) >= paidSlotsFor(input.surface)) return err({ code: 'slotsFull' })
  return ok(undefined)
}

/** Vagas livres em cada dia local de `[from, to)` (datas `AAAA-MM-DD`): vagas pagas menos o pico dentro do dia. */
export function availabilityByDay(
  existing: readonly PlacementPeriod[],
  surface: FeaturedSurface,
  from: string,
  to: string,
): { date: string; freeSlots: number }[] {
  const slots = paidSlotsFor(surface)
  const end = localMidnight(to).getTime()
  const days: { date: string; freeSlots: number }[] = []
  for (let day = localMidnight(from); day.getTime() < end; day = addDays(day, 1)) {
    const peak = peakOverlap(existing, { startsAt: day, endsAt: addDays(day, 1) })
    days.push({ date: localDateParts(day).isoDate, freeSlots: Math.max(0, slots - peak) })
  }
  return days
}

