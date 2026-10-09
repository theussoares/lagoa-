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
    const saved = await this.repo.updateActiveProgram(ownerUserId, draft, (current, cardsCount) => {
      if (!canChangeProgramMode(cardsCount, current.rules.mode, draft.rules.mode)) {
        this.logger.warn(`Program mode change locked: ${cardsCount} cards exist`)
        return err({ code: 'programModeLocked' })
      }
      return ok({ isNewVersion: hasCriticalChanges(current, draft) })
    })
    return saved
  }
}
