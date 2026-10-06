import { Injectable, Logger } from '@nestjs/common'
import { unitOf } from '#shared/domain/programStrategies'
import type { VisitQrUseError } from '#shared/domain/visitQr'
import { type CheckInResult, CheckInResultSchema, type VisitCodeClaimRequest, type VisitQrClaimRequest } from '#shared/schemas/visit'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import { parseVisitCode, parseVisitToken } from '#shared/utils/checkInCode'
import { addHours, toIso } from '#shared/utils/time'
import { Clock } from '../../common/clock'
import { hashVisitToken } from '../../common/visit-token'
import { ReferralSettlement } from '../../ledger/referral-settlement'
import { CheckInRepository, ProgramVersionChanged, type VisitClaimRecorded, type VisitQrLookup, type VisitQrTarget } from './check-in.repository'
import { decideEarning, decideQrUse, type EarningDecisionError } from './check-in.rules'

export type ClaimVisitQrError = ErrorOf<
  'invalidVisitQr' | 'visitQrExpired' | 'visitQrAlreadyUsed' | 'visitQrStale' | 'checkInCooldown' | 'shopQrJoinOnly' | 'unauthorized'
>

type ClaimRequest = VisitQrClaimRequest | VisitCodeClaimRequest

@Injectable()
export class CheckInService {
  constructor(
    private readonly repository: CheckInRepository,
    private readonly clock: Clock,
    private readonly referrals: ReferralSettlement,
  ) {}

  private readonly logger = new Logger(CheckInService.name)

  /**
   * Ganha pelo QR da visita (token do link ou código curto). Validade, uso único e janela são decididos aqui, nunca
   * pelo app. Reenviar o mesmo QR pela mesma pessoa devolve o ganho já gravado, então o `Idempotency-Key` que o app
   * ainda manda não entra na conta: quem identifica o toque é o próprio QR.
   */
  async claimVisitQr(customerId: string, request: ClaimRequest): Promise<Result<CheckInResult, ClaimVisitQrError>> {
    // App antigo mandando o código do cartaz: o QR da loja só coloca no clube. Sem I/O.
    if ('code' in request) return err({ code: 'shopQrJoinOnly' })
    const lookup = lookupOf(request)
    if (!lookup.ok) return lookup
    return this.claim(customerId, lookup.value, true)
  }

  /** Se o programa mudou entre a leitura e o lock, lê de novo uma vez. */
  private async claim(customerId: string, lookup: VisitQrLookup, retry: boolean): Promise<Result<CheckInResult, ClaimVisitQrError>> {
    const target = await this.repository.findVisitQr(lookup, customerId)
    if (target === null) return err({ code: 'invalidVisitQr' })

    const now = this.clock.now()
    try {
      const recorded = await this.repository.claim<VisitQrUseError | EarningDecisionError>(
        { customerId, target, now },
        { qr: (qr) => decideQrUse(qr, customerId, now), earning: (state) => decideEarning(target, state, now) },
      )
      if (!recorded.ok) {
        if (recorded.error.code === 'checkInCooldown') await this.noteRefusal(target.visitQrId, recorded.error.availableAt, now)
        return recorded
      }
      if (!recorded.value.replayed) await this.settleReferral(customerId, target.shop.id, now)
      return ok(toResult(target, recorded.value))
    } catch (error) {
      if (error instanceof ProgramVersionChanged && retry) return this.claim(customerId, lookup, false)
      throw error
    }
  }

  /** O QR continua ativo; a anotação só serve ao Balcão e, se falhar, o cliente continua recebendo a recusa certa. */
  private async noteRefusal(visitQrId: string, availableAt: string, refusedAt: Date): Promise<void> {
    try {
      await this.repository.noteRefusal(visitQrId, { availableAt: new Date(availableAt), refusedAt })
    } catch (error) {
      this.logger.warn(`Visit QR refusal note failed (${error instanceof Error ? error.name : 'unknown'})`)
    }
  }

  /**
   * A visita já está confirmada. Pagar a indicação é à parte e não pode derrubar o ganho: se falhar, a pendência
   * continua e o log leva só o tipo do erro. Roda a cada ganho novo (uma consulta pelo índice único `(loja, indicado)`),
   * então uma falha passageira é tentada de novo na visita seguinte; o pagamento é idempotente e só acontece com
   * cartão existente e criado depois do convite.
   */
  private async settleReferral(customerId: string, shopId: string, now: Date): Promise<void> {
    try {
      await this.referrals.settlePending(customerId, shopId, now)
    } catch (error) {
      this.logger.error(`Referral settlement failed (${error instanceof Error ? error.name : 'unknown'}) for shop ${shopId}`)
    }
  }
}

function lookupOf(request: Exclude<ClaimRequest, { code: string }>): Result<VisitQrLookup, ErrorOf<'invalidVisitQr'>> {
  if ('token' in request) {
    const token = parseVisitToken(request.token)
    return token.ok ? ok({ kind: 'tokenHash', tokenHash: hashVisitToken(token.value) }) : token
  }
  const code = parseVisitCode(request.visitCode)
  return code.ok ? ok({ kind: 'visitCode', code: code.value }) : code
}

function toResult(target: VisitQrTarget, recorded: VisitClaimRecorded): CheckInResult {
  const { shop } = target
  const { rules } = shop.program
  const { cardId, entryId, units, balanceAfter, recordedAt } = recorded
  const unit = unitOf(rules)
  return CheckInResultSchema.parse({
    activity: {
      id: entryId,
      shopId: shop.id,
      shopName: shop.name,
      kind: target.earn.kind,
      unit,
      units,
      rewardTitle: null,
      createdAt: toIso(recordedAt),
    },
    card: { cardId, unit, balance: balanceAfter, target: rules.target, rewardReady: balanceAfter >= rules.target },
    nextCheckInAt: toIso(addHours(recordedAt, target.cooldownHours)),
  })
}
