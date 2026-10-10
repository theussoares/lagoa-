import type { Program, ProgramDraft, ProgramMode, ProgramUnit } from '#shared/schemas/program'
import type { SelectOption } from '#layers/ui/app/types/form'
import type { StampCardModel } from '#layers/ui/app/types/wallet'
import type { TransportError } from '#shared/types/errors'
import type { AsyncResultState } from '#layers/core/app/types/asyncResult'
import type { UpdateProgramError } from '../services/ProgramService'
import type { ComputedRef, Ref } from 'vue'

export type ProgramField =
  | 'rewardTitle'
  | 'target'
  | 'pointsPerReal'
  | 'pointsPerVisit'
  | 'welcomeUnits'
  | 'referralUnits'
  | 'surpriseDate'
  | 'cooldownHours'
  | 'expirationMonths'

export type ProgramFieldErrors = Partial<Record<ProgramField, true>>

export interface NumberRange {
  readonly min: number
  readonly max: number
}

/** Limites do domínio para os campos numéricos; mudam com o modo e a meta. */
export interface ProgramFieldLimits {
  readonly target: NumberRange
  readonly rate: NumberRange
  readonly welcomeUnits: NumberRange
  readonly referralUnits: NumberRange
}

export interface ProgramPreview {
  readonly card: StampCardModel
  /** "1 carimbo por visita", "1 ponto por real gasto". */
  readonly earnLine: string
}

/** Seções do Programa que ficam fechadas até o lojista abrir. */
export type ProgramFoldSection = 'bonus' | 'visitRules'

export interface ProgramSectionSummaries {
  readonly bonus: string
  readonly visitRules: string
}

export interface ProgramSnapshot {
  readonly program: Program
  readonly activeCards: number
}

export type ProgramSaveState =
  | { status: 'idle' }
  | { status: 'saving' }
  | { status: 'saved' }
  | { status: 'error'; code: UpdateProgramError['code'] }

export interface ProgramEditor {
  state: ComputedRef<AsyncResultState<ProgramSnapshot, TransportError>>
  /** Rascunho editável; `null` até o programa carregar. */
  draft: Ref<ProgramDraft | null>
  /** Meta diferente da salva com cartões em andamento: a tela avisa que vale para eles. */
  targetChanged: ComputedRef<boolean>
  isDirty: ComputedRef<boolean>
  /** Só aparecem depois da primeira tentativa de salvar. */
  fieldErrors: ComputedRef<ProgramFieldErrors>
  saveState: Readonly<Ref<ProgramSaveState>>
  reload: () => Promise<void>
  setMode: (mode: ProgramMode) => void
  save: () => Promise<void>
  discard: () => void
}

export interface ProgramFieldOptions {
  readonly unit: ProgramUnit
  readonly limits: ProgramFieldLimits
  readonly cooldownOptions: readonly SelectOption[]
  readonly expirationOptions: readonly SelectOption[]
  /** Uma linha por seção fechada; null antes do rascunho carregar. */
  readonly summaries: ProgramSectionSummaries | null
}
