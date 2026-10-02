import type { Program, ProgramDraft } from '#shared/schemas/program'
import type { ErrorOf, TransportError } from '#shared/types/errors'
import type { Result } from '#shared/types/result'

export interface ProgramService {
  getProgram(): Promise<Result<Program, TransportError>>
  updateProgram(draft: ProgramDraft): Promise<Result<Program, ErrorOf<'invalidProgram'> | TransportError>>
}
