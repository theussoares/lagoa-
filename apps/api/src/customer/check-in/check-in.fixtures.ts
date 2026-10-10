import type { ErrorOf } from '#shared/types/errors'
import { ok, type Result } from '#shared/types/result'
import { catalogShop } from '../../shops/catalog.fixtures'
import {
  CheckInRepository,
  type LockedVisitQr,
  ProgramVersionChanged,
  type VisitClaimDeciders,
  type VisitClaimRecorded,
  type VisitClaimState,
  type VisitQrLookup,
  type VisitQrTarget,
} from './check-in.repository'

export const SHOP_ID = '0190a000-0000-7000-8000-0000000000a1'
export const PROGRAM_ID = '0190a000-0000-7000-8000-0000000000b1'
export const VISIT_QR_ID = '0190a000-0000-7000-8000-0000000000d1'
export const ENTRY_ID = '0190a000-0000-7000-8000-0000000000e1'
export const CARD_ID = '0190a000-0000-7000-8000-0000000000c1'
export const ISSUER_ID = '0190a000-0000-7000-8000-0000000000f1'

/** QR emitido às 11:58 para quem usa às 12:00 (validade de 5 min, ainda vale). */
export const ISSUED_AT = new Date('2026-10-03T11:58:00Z')

export function visitQrTarget(overrides: Partial<VisitQrTarget> = {}): VisitQrTarget {
  return {
    visitQrId: VISIT_QR_ID,
    shop: catalogShop(),
    programId: PROGRAM_ID,
    cooldownHours: 24,
    issuedBy: ISSUER_ID,
    earn: { kind: 'visit' },
    ...overrides,
  }
}

/** O QR como está gravado, ativo, da versão ativa da loja. */
export function lockedVisitQr(overrides: Partial<LockedVisitQr> = {}): LockedVisitQr {
  return {
    status: 'active',
    cancelReason: null,
    expiresAt: new Date('2026-10-03T12:03:00Z'),
    claimedBy: null,
    issuedBy: ISSUER_ID,
    shopOwnerId: ISSUER_ID,
    claimedAt: null,
    ledgerEntryId: null,
    programId: PROGRAM_ID,
    activeProgramId: PROGRAM_ID,
    shopApproved: true,
    ...overrides,
  }
}

/** Estado de quem nunca visitou a loja (cartão recém-criado ou só com bônus). */
export const FIRST_VISIT: VisitClaimState = { card: { balance: 0, rewardExpiresAt: null, lastVisitAt: null }, birthday: null }

export function stateOf(card: { balance?: number; lastVisitAt?: Date | null; rewardExpiresAt?: Date | null }, birthday: VisitClaimState['birthday'] = null): VisitClaimState {
  return { card: { balance: card.balance ?? 0, rewardExpiresAt: card.rewardExpiresAt ?? null, lastVisitAt: card.lastVisitAt ?? null }, birthday }
}

/** Repository em memória: roda os decisores de verdade sobre o QR e o cartão que o teste configurar. */
export class FakeCheckInRepository extends CheckInRepository {
  calls: string[] = []
  lookups: VisitQrLookup[] = []
  refusals: { visitQrId: string; availableAt: Date; refusedAt: Date }[] = []
  qr: LockedVisitQr = lockedVisitQr()
  state: VisitClaimState = FIRST_VISIT
  versionChanges = 0
  noteFails = false
  /** Falha inesperada na leitura (o driver do banco caiu). */
  findFails: Error | null = null
  constructor(public target: VisitQrTarget | null) {
    super()
  }
  async findVisitQr(lookup: VisitQrLookup): Promise<VisitQrTarget | null> {
    this.calls.push('find')
    if (this.findFails) throw this.findFails
    this.lookups.push(lookup)
    return this.target
  }
  async claim<E>(
    attempt: { readonly customerId: string; readonly target: VisitQrTarget; readonly now: Date },
    decide: VisitClaimDeciders<E>,
  ): Promise<Result<VisitClaimRecorded, E | ErrorOf<'unauthorized'>>> {
    this.calls.push('claim')
    if (this.versionChanges > 0) {
      this.versionChanges -= 1
      throw new ProgramVersionChanged()
    }
    const use = decide.qr(this.qr)
    if (!use.ok) return use
    if (use.value === 'replay') {
      return ok({ cardId: CARD_ID, entryId: ENTRY_ID, units: 1, balanceAfter: 5, recordedAt: new Date('2026-10-03T11:00:00Z'), replayed: true })
    }
    this.calls.push('earning')
    const decision = decide.earning(this.state)
    if (!decision.ok) return decision
    return ok({ cardId: CARD_ID, entryId: ENTRY_ID, units: decision.value.units, balanceAfter: decision.value.balanceAfter, recordedAt: attempt.now, replayed: false })
  }
  async noteRefusal(visitQrId: string, refusal: { availableAt: Date; refusedAt: Date }): Promise<void> {
    this.calls.push('noteRefusal')
    if (this.noteFails) throw new Error('db down: key (phone_hash)=(secret)')
    this.refusals.push({ visitQrId, ...refusal })
  }
}
