import { z } from 'zod'
import { allowing, transportOnly, type ApiClient } from '#layers/core/app/services/http/ApiClient'
import { ok } from '#shared/types/result'
import { ProgramSchema, type ProgramDraft } from '#shared/schemas/program'
import type { ProgramService } from '../ProgramService'

export class HttpProgramService implements ProgramService {
  constructor(private readonly api: ApiClient) {}

  async getProgram() {
    return transportOnly(await this.api.get('/merchant/program', ProgramSchema))
  }

  async countActiveCards() {
    const res = transportOnly(
      await this.api.get('/merchant/program/active-cards', z.object({ count: z.number().int().nonnegative() })),
    )
    if (!res.ok) return res
    return ok(res.value.count)
  }

  async updateProgram(draft: ProgramDraft) {
    const res = await this.api.put('/merchant/program', ProgramSchema, { body: draft })
    return allowing('invalidProgram', 'programModeLocked')(res)
  }
}
