import { Injectable, Logger } from '@nestjs/common'
import type { Program, ProgramDraft } from '#shared/schemas/program'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import { Clock } from '../../common/clock'
import { ProgramRepository } from './program.repository'
import { hasCriticalChanges } from './program.rules'

export type ProgramServiceError = ErrorOf<'notFound' | 'invalidProgram'>

@Injectable()
export class ProgramService {
  private readonly logger = new Logger(ProgramService.name)

  constructor(
    private readonly repo: ProgramRepository,
    private readonly clock: Clock,
  ) {}

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
    // Sem trava de modo: mudar regra cria uma versão nova do programa; cartão com saldo termina na versão em que nasceu.
    return this.repo.updateActiveProgram(ownerUserId, draft, (current) => ({ isNewVersion: hasCriticalChanges(current, draft) }), this.clock.now())
  }
}
