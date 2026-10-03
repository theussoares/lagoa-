import type { EarnSource, Stamp } from '#shared/schemas/loyaltyCard'
import { toIso } from '#shared/utils/time'

export type EarnedKind = 'visit' | 'amount' | 'checkIn' | 'welcomeBonus' | 'referralBonus'

/** Linha positiva do ledger do cartão. */
export interface EarnedEntry {
  readonly kind: EarnedKind
  readonly units: number
  readonly occurredAt: Date
}

const SOURCE_BY_KIND: Readonly<Record<EarnedKind, EarnSource>> = {
  visit: 'counter',
  amount: 'counterAmount',
  checkIn: 'checkIn',
  welcomeBonus: 'welcomeBonus',
  referralBonus: 'referralBonus',
}

/**
 * Não existe tabela de carimbos: as casas saem do ledger. Resgate e expiração consomem as
 * unidades mais antigas, então o que sobra no cartão são as últimas `balance` unidades ganhas.
 * `earnedNewestFirst` vem da mais nova para a mais antiga; o resultado sai numerado de 1 em diante.
 */
export function deriveStamps(earnedNewestFirst: readonly EarnedEntry[], balance: number): Stamp[] {
  const newestFirst: Omit<Stamp, 'number'>[] = []
  for (const entry of earnedNewestFirst) {
    const earnedAt = toIso(entry.occurredAt)
    for (let unit = 0; unit < entry.units && newestFirst.length < balance; unit++) {
      newestFirst.push({ earnedAt, source: SOURCE_BY_KIND[entry.kind] })
    }
    if (newestFirst.length >= balance) break
  }
  return newestFirst.reverse().map((stamp, index) => ({ ...stamp, number: index + 1 }))
}
