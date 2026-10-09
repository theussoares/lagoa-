import { Injectable, Logger } from '@nestjs/common'
import { VISIT_CODE_LENGTH } from '#shared/constants/domain'
import { visitQrExpiresAt } from '#shared/domain/visitQr'
import {
  type IssuedVisitQr,
  IssuedVisitQrSchema,
  type VisitQr,
  type VisitQrCancelReason,
  type VisitQrIssueRequest,
  VisitQrSchema,
} from '#shared/schemas/visitQr'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import { toIso } from '#shared/utils/time'
import { Clock } from '../../common/clock'
import { generateReadableCode } from '../../common/readable-code'
import { generateVisitToken, hashVisitToken } from '../../common/visit-token'
import { SessionRepository } from '../session/session.repository'
import { VisitQrsRepository } from './visit-qrs.repository'
import { VisitQrsRules } from './visit-qrs.rules'

export type IssueVisitQrError = ErrorOf<
  'notFound' | 'shopPendingApproval' | 'shopSuspended' | 'invalidAmount' | 'amountNotAccepted'
>

export type GetVisitQrError = ErrorOf<
  'notFound' | 'shopPendingApproval' | 'shopSuspended'
>

export type CancelVisitQrError = ErrorOf<
  'notFound' | 'shopPendingApproval' | 'shopSuspended'
>

@Injectable()
export class VisitQrsService {
  private readonly logger = new Logger(VisitQrsService.name)

  constructor(
    private readonly repository: VisitQrsRepository,
    private readonly sessionRepo: SessionRepository,
    private readonly rules: VisitQrsRules,
    private readonly clock: Clock,
  ) {}

  async issueVisitQr(
    ownerUserId: string,
    request: VisitQrIssueRequest,
  ): Promise<Result<IssuedVisitQr, IssueVisitQrError>> {
    const shop = await this.sessionRepo.findByOwnerUserId(ownerUserId)
    if (!shop) return err({ code: 'notFound', entity: 'merchant' })
    if (shop.status === 'pending') return err({ code: 'shopPendingApproval' })
    if (shop.status === 'suspended') return err({ code: 'shopSuspended' })

    const activeProgram = await this.repository.findActiveProgram(shop.id)
    if (!activeProgram) return err({ code: 'notFound', entity: 'program' })

    const plannedEarn = this.rules.planIssue(activeProgram.rules, request.amountCents)
    if (!plannedEarn.ok) return plannedEarn

    const token = generateVisitToken()
    const tokenHash = hashVisitToken(token)
    const visitCode = generateReadableCode(VISIT_CODE_LENGTH)

    const now = this.clock.now()
    const expiresAt = visitQrExpiresAt(now)

    const id = await this.repository.createVisitQr({
      shopId: shop.id,
      programId: activeProgram.id,
      issuedBy: ownerUserId,
      tokenHash,
      visitCode,
      earn: plannedEarn.value,
      createdAt: now,
      expiresAt,
    })

    const issued: IssuedVisitQr = IssuedVisitQrSchema.parse({
      id,
      token,
      visitCode,
      status: 'active',
      earn: plannedEarn.value,
      createdAt: toIso(now),
      expiresAt: toIso(expiresAt),
      claim: null,
      refusal: null,
    })

    return ok(issued)
  }

  async getVisitQr(
    ownerUserId: string,
    id: string,
  ): Promise<Result<VisitQr, GetVisitQrError>> {
    const shop = await this.sessionRepo.findByOwnerUserId(ownerUserId)
    if (!shop) return err({ code: 'notFound', entity: 'merchant' })
    if (shop.status === 'pending') return err({ code: 'shopPendingApproval' })
    if (shop.status === 'suspended') return err({ code: 'shopSuspended' })

    const qr = await this.repository.findById(shop.id, id)
    if (!qr) return err({ code: 'notFound', entity: 'visitQr' })

    const derivedStatus = this.rules.deriveStatus(
      qr.status,
      new Date(qr.expiresAt),
      this.clock.now(),
    )

    return ok(VisitQrSchema.parse({ ...qr, status: derivedStatus }))
  }

  async cancelVisitQr(
    ownerUserId: string,
    id: string,
    reason: VisitQrCancelReason = 'merchant',
  ): Promise<Result<VisitQr, CancelVisitQrError>> {
    const shop = await this.sessionRepo.findByOwnerUserId(ownerUserId)
    if (!shop) return err({ code: 'notFound', entity: 'merchant' })
    if (shop.status === 'pending') return err({ code: 'shopPendingApproval' })
    if (shop.status === 'suspended') return err({ code: 'shopSuspended' })

    const existing = await this.repository.findById(shop.id, id)
    if (!existing) return err({ code: 'notFound', entity: 'visitQr' })

    const derivedStatus = this.rules.deriveStatus(
      existing.status,
      new Date(existing.expiresAt),
      this.clock.now(),
    )

    // RN-10: se não estiver ativo, cancelamento é idempotente (devolve sem alterar ganho/expiração)
    if (derivedStatus !== 'active') {
      return ok(VisitQrSchema.parse({ ...existing, status: derivedStatus }))
    }

    const cancelled = await this.repository.cancel(shop.id, id, reason)
    if (!cancelled) return err({ code: 'notFound', entity: 'visitQr' })

    return ok(VisitQrSchema.parse(cancelled))
  }
}
