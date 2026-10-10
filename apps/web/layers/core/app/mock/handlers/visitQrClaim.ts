import { checkInAvailableAt } from '#shared/domain/antifraud'
import { toCardProgress } from '#shared/domain/loyaltyCard'
import { decideVisitEarning, decideVisitQrUse } from '#shared/domain/visitQr'
import type { EarningCard } from '#shared/domain/earning'
import type { CustomerId, ShopId, VisitQrId } from '#shared/schemas/ids'
import type { Program } from '#shared/schemas/program'
import type { CheckInResult } from '#shared/schemas/visit'
import type { VisitQr, VisitQrCredential } from '#shared/schemas/visitQr'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok } from '#shared/types/result'
import type { Result } from '#shared/types/result'
import { addHours, toIso } from '#shared/utils/time'
import type { VisitQrRecord } from '../state'
import type { MockContext } from './context'
import { appendLedger, applyEarningPlan, toWalletActivity } from './earning'
import { findCard, findCustomer, findProgram, findShop } from './queries'
import { findShopVisitQr, replaceVisitQr, toVisitQrView } from './visitQr'
import type { LookupError } from './visitQr'

export type ClaimError = ErrorOf<
  'invalidVisitQr' | 'visitQrExpired' | 'visitQrAlreadyUsed' | 'visitQrStale' | 'checkInCooldown' | 'unauthorized'
>

/** Por código curto vale o mais novo: o código só é único entre os ativos, linhas velhas podem repeti-lo. */
function findByCredential(ctx: MockContext, credential: VisitQrCredential): VisitQrRecord | undefined {
  if (credential.kind === 'token') return ctx.state.visitQrs.find((record) => record.token === credential.token)
  return ctx.state.visitQrs
    .filter((record) => record.visitCode === credential.code)
    .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
}

function earningCardOf(ctx: MockContext, customerId: CustomerId, shopId: ShopId): EarningCard {
  const card = findCard(ctx, customerId, shopId)
  if (card === undefined) return { balance: 0, rewardExpiresAt: null, lastVisitAt: null }
  return {
    balance: card.balance,
    rewardExpiresAt: card.rewardExpiresAt === null ? null : new Date(card.rewardExpiresAt),
    lastVisitAt: card.lastVisitAt === null ? null : new Date(card.lastVisitAt),
  }
}

function replayResult(ctx: MockContext, record: VisitQrRecord, program: Program): Result<CheckInResult, ClaimError> {
  const ledgerRecord = ctx.state.ledger.find((item) => item.id === record.ledgerEntryId)
  if (ledgerRecord === undefined || record.cardAfter === null || record.claimedAt === null) {
    return err({ code: 'invalidVisitQr' })
  }
  return ok({
    activity: toWalletActivity(ctx, ledgerRecord),
    card: record.cardAfter,
    nextCheckInAt: toIso(addHours(new Date(record.claimedAt), program.checkIn.cooldownHours)),
  })
}

/** Mesma ordem do servidor (RN-11); a decisão é do `shared/domain/visitQr`, o mock só aplica o resultado. */
export function claimVisitQr(
  ctx: MockContext,
  customerId: CustomerId,
  credential: VisitQrCredential,
): Result<CheckInResult, ClaimError> {
  const customer = findCustomer(ctx, customerId)
  if (customer === undefined) return err({ code: 'unauthorized' })
  const record = findByCredential(ctx, credential)
  if (record === undefined) return err({ code: 'invalidVisitQr' })
  const shop = findShop(ctx, record.shopId)
  const program = findProgram(ctx, record.shopId)

  const decision = decideVisitQrUse(
    {
      status: record.status,
      cancelReason: record.cancelReason,
      expiresAt: new Date(record.expiresAt),
      claimedBy: record.claimedBy,
      // O mock separa lojistas de clientes: um cliente nunca é o emissor.
      issuedBy: null,
      shopOwnerId: null,
      programId: record.programId,
      activeProgramId: program?.id ?? null,
      shopApproved: shop?.status === 'approved',
    },
    customerId,
    ctx.now,
  )
  if (!decision.ok) return decision
  if (program === undefined) return err({ code: 'invalidVisitQr' })
  if (decision.value === 'replay') return replayResult(ctx, record, program)

  const card = earningCardOf(ctx, customerId, record.shopId)
  const plan = decideVisitEarning({
    rules: program.rules,
    bonusRules: program.bonusRules,
    cooldownHours: program.checkIn.cooldownHours,
    card,
    birthday: customer.birthday,
    earn: record.earn,
    now: ctx.now,
  })
  if (!plan.ok) {
    // Recusa por janela não consome o QR (RN-16): só anota para o Balcão mostrar.
    if (plan.error.code === 'checkInCooldown') {
      replaceVisitQr(ctx, { ...record, refusal: { code: 'checkInCooldown', availableAt: plan.error.availableAt, refusedAt: toIso(ctx.now) } })
    }
    return plan
  }

  const isAmount = record.earn.kind === 'amount'
  const credited = applyEarningPlan(ctx, customer, program, plan.value, isAmount ? 'counterAmount' : 'counter')
  const ledgerRecord = appendLedger(ctx, {
    shopId: record.shopId,
    customerId,
    kind: isAmount ? 'amount' : 'visit',
    unit: credited.unit,
    units: plan.value.units,
    amountCents: record.earn.kind === 'amount' ? record.earn.amountCents : null,
    rewardTitle: null,
    isNewCustomer: card.lastVisitAt === null,
  })
  const cardAfter = toCardProgress(credited)
  replaceVisitQr(ctx, {
    ...record,
    status: 'claimed',
    claimedBy: customerId,
    claimedAt: toIso(ctx.now),
    ledgerEntryId: ledgerRecord.id,
    cardAfter,
    welcomeUnits: plan.value.welcomeUnits,
    refusal: null,
  })
  return ok({
    activity: toWalletActivity(ctx, ledgerRecord),
    card: cardAfter,
    nextCheckInAt: toIso(addHours(ctx.now, program.checkIn.cooldownHours)),
  })
}

/** RN-22: o primeiro cliente do seed sem janela aberta nesta loja "escaneia" o QR, pelo mesmo caminho do cliente real. */
export function simulateVisitQrClaim(ctx: MockContext, shopId: ShopId, id: VisitQrId): Result<VisitQr, LookupError> {
  const found = findShopVisitQr(ctx, shopId, id)
  if (!found.ok) return found
  const cooldownHours = findProgram(ctx, shopId)?.checkIn.cooldownHours ?? 0
  const canEarn = (customerId: CustomerId): boolean => {
    const lastVisitAt = findCard(ctx, customerId, shopId)?.lastVisitAt ?? null
    return checkInAvailableAt(lastVisitAt === null ? null : new Date(lastVisitAt), cooldownHours, ctx.now) === null
  }
  const customer = ctx.state.customers.find((item) => canEarn(item.id)) ?? ctx.state.customers[0]
  if (customer !== undefined) claimVisitQr(ctx, customer.id, { kind: 'token', token: found.value.token })
  const after = ctx.state.visitQrs.find((record) => record.id === id)
  return ok(toVisitQrView(ctx, after ?? found.value))
}
