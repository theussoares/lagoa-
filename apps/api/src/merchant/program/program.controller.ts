import { Body, Controller, Get, Put } from '@nestjs/common'
import {
  type Program,
  type ProgramDraft,
  ProgramDraftSchema,
} from '#shared/schemas/program'
import type { AuthUser } from '../../auth/auth.types'
import { CurrentUser } from '../../auth/current-user.decorator'
import { unwrap } from '../../common/http/domain-exception'
import { ZodValidationPipe } from '../../common/http/zod-validation.pipe'
import { ProgramService } from './program.service'

@Controller('merchant/program')
export class ProgramController {
  constructor(private readonly programService: ProgramService) {}

  @Get()
  async getProgram(@CurrentUser() user: AuthUser): Promise<Program> {
    return unwrap(await this.programService.getProgram(user.id))
  }

  @Get('cards/count')
  async getCardsCount(@CurrentUser() user: AuthUser): Promise<{ count: number }> {
    return unwrap(await this.programService.countActiveCards(user.id))
  }

  @Get('active-cards')
  async getActiveCards(@CurrentUser() user: AuthUser): Promise<{ count: number }> {
    return unwrap(await this.programService.countActiveCards(user.id))
  }

  @Put()
  async updateProgram(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(ProgramDraftSchema)) body: ProgramDraft,
  ): Promise<Program> {
    return unwrap(await this.programService.updateProgram(user.id, body))
  }
}
