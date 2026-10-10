import type { Program, ProgramDraft } from '#shared/schemas/program'
import type { ErrorOf, TransportError } from '#shared/types/errors'
import type { Result } from '#shared/types/result'

export type UpdateProgramError = ErrorOf<'invalidProgram'> | TransportError

export interface ProgramService {
  getProgram(): Promise<Result<Program, TransportError>>
  /** Cartões da loja com clientes; com algum, o modo do programa fica travado. */
  countActiveCards(): Promise<Result<number, TransportError>>
  updateProgram(draft: ProgramDraft): Promise<Result<Program, UpdateProgramError>>
}
