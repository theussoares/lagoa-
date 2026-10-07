import { Injectable, Logger } from '@nestjs/common'
import type { Program, ProgramDraft } from '#shared/schemas/program'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import { ProgramRepository } from './program.repository'
import { canChangeProgramMode, hasCriticalChanges } from './program.rules'

export type ProgramServiceError = ErrorOf<'notFound' | 'programModeLocked' | 'invalidProgram'>

@Injectable()
export class ProgramService {
  private readonly logger = new Logger(ProgramService.name)

  constructor(private readonly repo: ProgramRepository) {}

  async getProgram(ownerUserId: string): Promise<Result<Program, ErrorOf<'notFound'>>> {
    const data = await this.repo.findActiveProgramByOwner(ownerUserId)
    if (!data) {
      return err({ code: 'notFound', entity: 'program' })
    }
    return ok(data.program)
  }

  async countActiveCards(ownerUserId: string): Promise<Result<{ count: number }, ErrorOf<'notFound'>>> {
    const data = await this.repo.findActiveProgramByOwner(ownerUserId)
    if (!data) {
      return err({ code: 'notFound', entity: 'shop' })
    }
    const count = await this.repo.countCardsByShopId(data.shopId)
    return ok({ count })
  }

  async updateProgram(
    ownerUserId: string,
    draft: ProgramDraft,
  ): Promise<Result<Program, ProgramServiceError>> {
    const data = await this.repo.findActiveProgramByOwner(ownerUserId)
    if (!data) {
      return err({ code: 'notFound', entity: 'program' })
    }

    const cardsCount = await this.repo.countCardsByShopId(data.shopId)

    if (!canChangeProgramMode(cardsCount, data.program.rules.mode, draft.rules.mode)) {
      this.logger.warn(`Program mode change locked for shop ${data.shopId}: ${cardsCount} active cards exist`)
      return err({ code: 'programModeLocked' })
    }

    const isNewVersion = hasCriticalChanges(data.program, draft)
    const saved = await this.repo.saveProgram(data.shopId, data.program.id, draft, isNewVersion)

    return ok(saved)
  }
}
