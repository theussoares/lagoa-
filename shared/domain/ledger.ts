import type { LedgerKind } from '../schemas/visit'

const visitKinds: Readonly<Record<LedgerKind, boolean>> = {
  visit: true,
  amount: true,
  checkIn: true,
  redemption: false,
  campaignBonus: false,
  welcomeBonus: false,
  referralBonus: false,
}

/** Aparece na caderneta do Balcão? Presente de campanha não passou pelo balcão. */
const counterKinds: Readonly<Record<LedgerKind, boolean>> = {
  visit: true,
  amount: true,
  checkIn: true,
  redemption: true,
  campaignBonus: false,
  welcomeBonus: false,
  referralBonus: false,
}

export function isVisitKind(kind: LedgerKind): boolean {
  return visitKinds[kind]
}

export function isCounterKind(kind: LedgerKind): boolean {
  return counterKinds[kind]
}
