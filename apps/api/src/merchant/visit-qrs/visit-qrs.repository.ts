import type { ProgramRules } from '#shared/schemas/program'
import type { IssuedVisitQr, VisitQr, VisitQrCancelReason, VisitQrEarn } from '#shared/schemas/visitQr'

export interface ActiveProgramRules {
  readonly id: string
  readonly rules: ProgramRules
}

export interface InsertVisitQrParams {
  readonly shopId: string
  readonly programId: string
  readonly issuedBy: string
  readonly tokenHash: Buffer
  readonly visitCode: string
  readonly earn: VisitQrEarn
  readonly createdAt: Date
  readonly expiresAt: Date
}

export abstract class VisitQrsRepository {
  abstract findActiveProgram(shopId: string): Promise<ActiveProgramRules | null>
  abstract createVisitQr(params: InsertVisitQrParams): Promise<string>
  abstract findById(shopId: string, id: string): Promise<VisitQr | null>
  abstract cancel(shopId: string, id: string, reason: VisitQrCancelReason): Promise<VisitQr | null>
}
