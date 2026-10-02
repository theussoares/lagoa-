import type { LedgerKind } from '../schemas/visit'

/** Conta como visita (sumiço, antifraude, desafios, contagem de visitas)? */
const visitKinds: Readonly<Record<LedgerKind, boolean>> = {
  visit: true,
  amount: true,
  checkIn: true,
  redemption: false,
  campaignBonus: false,
}

/** Aparece na caderneta do Balcão? Presente de campanha não passou pelo balcão. */
const counterKinds: Readonly<Record<LedgerKind, boolean>> = {
  visit: true,
  amount: true,
  checkIn: true,
  redemption: true,
  campaignBonus: false,
}

export function isVisitKind(kind: LedgerKind): boolean {
  return visitKinds[kind]
}

export function isCounterKind(kind: LedgerKind): boolean {
  return counterKinds[kind]
}
