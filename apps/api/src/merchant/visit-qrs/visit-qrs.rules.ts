import { Injectable } from '@nestjs/common'
import type { ProgramRules } from '#shared/schemas/program'
import type { VisitQrEarn, VisitQrStatus } from '#shared/schemas/visitQr'
import type { EarnError } from '#shared/domain/programStrategies'
import { planVisitQrIssue, visitQrStatusAt } from '#shared/domain/visitQr'
import type { Result } from '#shared/types/result'

@Injectable()
export class VisitQrsRules {
  planIssue(rules: ProgramRules, amountCents: number | undefined): Result<VisitQrEarn, EarnError> {
    return planVisitQrIssue(rules, amountCents)
  }

  deriveStatus(status: VisitQrStatus, expiresAt: Date, now: Date): VisitQrStatus {
    return visitQrStatusAt({ status, expiresAt }, now)
  }
}
