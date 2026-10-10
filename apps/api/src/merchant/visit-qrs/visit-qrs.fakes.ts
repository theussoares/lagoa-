import { VISIT_QR_ACTIVE_MAX_PER_SHOP } from '#shared/constants/domain'
import type { ProgramRules } from '#shared/schemas/program'
import type { ShopStatus } from '#shared/schemas/shop'
import type { VisitQr, VisitQrCancelReason } from '#shared/schemas/visitQr'
import { err, ok, type Result } from '#shared/types/result'
import { type IssueError, type IssuedRow, type IssueVisitQrCommand, VisitQrsRepository } from './visit-qrs.repository'

export interface FakeProgram {
  readonly id: string
  readonly rules: ProgramRules
}

/** Repository em memória: roda o `plan` de verdade sobre a loja que o teste configurar e aplica o teto de ativos. */
export class FakeVisitQrsRepository extends VisitQrsRepository {
  activeProgram: FakeProgram | null = null
  /** Situação que a "transação" encontra ao travar a loja (normalmente a mesma do teste). */
  shopStatus: () => ShopStatus = () => 'approved'
  activeCount = 0
  qrs = new Map<string, VisitQr>()
  lastIssued: IssueVisitQrCommand | null = null
  /** Simula o erro inesperado do driver (que pode trazer credencial na mensagem). */
  issueFails: Error | null = null
  private nextId = 0

  async issue(command: IssueVisitQrCommand): Promise<Result<IssuedRow, IssueError>> {
    this.lastIssued = command
    if (this.issueFails) throw this.issueFails
    if (!this.activeProgram) return err({ code: 'notFound', entity: 'program' })
    const planned = command.plan({ status: this.shopStatus(), programId: this.activeProgram.id, rules: this.activeProgram.rules })
    if (!planned.ok) return planned
    if (this.activeCount >= VISIT_QR_ACTIVE_MAX_PER_SHOP) return err({ code: 'visitQrLimitReached' })
    const id = `018f98a2-7b2a-7182-9f33-6d004bbb${String(this.nextId++).padStart(4, '0')}`
    const visitCode = command.newVisitCode()
    this.qrs.set(id, {
      id,
      visitCode,
      status: 'active',
      earn: planned.value,
      createdAt: command.now.toISOString(),
      expiresAt: command.expiresAt.toISOString(),
      claim: null,
      refusal: null,
    } as VisitQr)
    return ok({ id, visitCode, earn: planned.value })
  }

  async findById(_shopId: string, id: string): Promise<VisitQr | null> {
    return this.qrs.get(id) ?? null
  }

  async cancel(_shopId: string, id: string, _reason: VisitQrCancelReason, _now: Date): Promise<VisitQr | null> {
    const existing = this.qrs.get(id)
    if (!existing) return null
    const updated: VisitQr = { ...existing, status: 'cancelled' }
    this.qrs.set(id, updated)
    return updated
  }
}
