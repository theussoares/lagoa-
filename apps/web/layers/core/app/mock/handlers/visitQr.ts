import { visitQrExpiresAt, visitQrStatusAt, planVisitQrIssue } from '#shared/domain/visitQr'
import { VISIT_CODE_LENGTH } from '#shared/constants/domain'
import { VisitCodeSchema } from '#shared/schemas/visitQr'
import { VisitQrIdSchema } from '#shared/schemas/ids'
import type { MerchantId, ShopId, VisitQrId } from '#shared/schemas/ids'
import type { IssuedVisitQr, VisitCode, VisitQr, VisitQrIssueRequest } from '#shared/schemas/visitQr'
import type { VisitRegistered } from '#shared/schemas/visit'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok } from '#shared/types/result'
import type { Result } from '#shared/types/result'
import { toIso } from '#shared/utils/time'
import type { VisitQrRecord } from '../state'
import { randomReadableCode, randomVisitToken } from './codes'
import type { MockContext } from './context'
import { toCounterEntry } from './earning'
import { findProgram } from './queries'
import { requireOperationalShop } from './shopAccess'
import type { ShopAccessError } from './shopAccess'

export type IssueError = ErrorOf<'invalidAmount' | 'amountNotAccepted'> | ShopAccessError
/** `VisitQr` de outra loja responde como inexistente (o contrato ainda não tem uma entidade própria para o `notFound`). */
export type LookupError = ErrorOf<'notFound'> | ShopAccessError

const CODE_ATTEMPTS = 50

export function statusOf(ctx: MockContext, record: VisitQrRecord): VisitQr['status'] {
  return visitQrStatusAt({ status: record.status, expiresAt: new Date(record.expiresAt) }, ctx.now)
}

export function replaceVisitQr(ctx: MockContext, next: VisitQrRecord): void {
  ctx.state.visitQrs = ctx.state.visitQrs.map((record) => (record.id === next.id ? next : record))
}

/** Único entre os ativos e não vencidos (os vencidos liberam o código, como o índice parcial do banco). */
function freshVisitCode(ctx: MockContext): VisitCode {
  const inUse = new Set(
    ctx.state.visitQrs.filter((record) => statusOf(ctx, record) === 'active').map((record) => record.visitCode),
  )
  for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt += 1) {
    const code = VisitCodeSchema.parse(randomReadableCode(ctx, VISIT_CODE_LENGTH))
    if (!inUse.has(code)) return code
  }
  throw new Error('No free visit code after the collision attempts')
}

/** O recibo do ganho é o mesmo que o Balcão já mostra; o celular só sai mascarado. */
function claimReceipt(ctx: MockContext, record: VisitQrRecord): VisitRegistered | null {
  const ledgerRecord = ctx.state.ledger.find((item) => item.id === record.ledgerEntryId)
  if (ledgerRecord === undefined || record.cardAfter === null) return null
  const entry = toCounterEntry(ctx, ledgerRecord)
  if (!entry.ok || ledgerRecord.units <= 0) return null
  return { entry: entry.value, card: record.cardAfter, unitsEarned: ledgerRecord.units, welcomeUnits: record.welcomeUnits }
}

export function toVisitQrView(ctx: MockContext, record: VisitQrRecord): VisitQr {
  return {
    id: record.id,
    visitCode: record.visitCode,
    status: statusOf(ctx, record),
    earn: record.earn,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
    claim: record.status === 'claimed' ? claimReceipt(ctx, record) : null,
    refusal: record.refusal,
  }
}

export function issueVisitQr(
  ctx: MockContext,
  shopId: ShopId,
  issuedBy: MerchantId,
  request: VisitQrIssueRequest,
): Result<IssuedVisitQr, IssueError> {
  const shop = requireOperationalShop(ctx, shopId)
  if (!shop.ok) return shop
  const program = findProgram(ctx, shopId)
  if (program === undefined) return err({ code: 'unauthorized' })
  const earn = planVisitQrIssue(program.rules, request.amountCents)
  if (!earn.ok) return earn

  const record: VisitQrRecord = {
    id: VisitQrIdSchema.parse(ctx.ids.next('vqr')),
    shopId,
    programId: program.id,
    issuedBy,
    token: randomVisitToken(ctx),
    visitCode: freshVisitCode(ctx),
    earn: earn.value,
    status: 'active',
    cancelReason: null,
    createdAt: toIso(ctx.now),
    expiresAt: toIso(visitQrExpiresAt(ctx.now)),
    claimedBy: null,
    claimedAt: null,
    ledgerEntryId: null,
    cardAfter: null,
    welcomeUnits: 0,
    refusal: null,
  }
  ctx.state.visitQrs.push(record)
  return ok({ ...toVisitQrView(ctx, record), token: record.token })
}

/** QR de outra loja é igual a QR inexistente: não vaza que ele existe. */
export function findShopVisitQr(ctx: MockContext, shopId: ShopId, id: VisitQrId): Result<VisitQrRecord, LookupError> {
  const shop = requireOperationalShop(ctx, shopId)
  if (!shop.ok) return shop
  const record = ctx.state.visitQrs.find((item) => item.id === id && item.shopId === shopId)
  return record === undefined ? err({ code: 'notFound', entity: 'visitQr' }) : ok(record)
}

export function getVisitQr(ctx: MockContext, shopId: ShopId, id: VisitQrId): Result<VisitQr, LookupError> {
  const found = findShopVisitQr(ctx, shopId, id)
  return found.ok ? ok(toVisitQrView(ctx, found.value)) : found
}

/** Idempotente (RN-10): só o que está `active` vira `cancelled`; o resto volta como está, e `claimed` não desfaz o ganho. */
export function cancelVisitQr(ctx: MockContext, shopId: ShopId, id: VisitQrId): Result<VisitQr, LookupError> {
  const found = findShopVisitQr(ctx, shopId, id)
  if (!found.ok) return found
  if (statusOf(ctx, found.value) !== 'active') return ok(toVisitQrView(ctx, found.value))
  const cancelled: VisitQrRecord = { ...found.value, status: 'cancelled', cancelReason: 'merchant' }
  replaceVisitQr(ctx, cancelled)
  return ok(toVisitQrView(ctx, cancelled))
}

/** RN-15: trocar o programa invalida o que ainda está no ar; o cliente que chegar com um deles recebe `visitQrStale`. */
export function cancelActiveVisitQrs(ctx: MockContext, shopId: ShopId): void {
  ctx.state.visitQrs = ctx.state.visitQrs.map((record) =>
    record.shopId === shopId && statusOf(ctx, record) === 'active'
      ? { ...record, status: 'cancelled', cancelReason: 'programChanged' }
      : record,
  )
}
