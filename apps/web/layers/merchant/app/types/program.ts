import type { Program, ProgramDraft, ProgramMode } from '#shared/schemas/program'
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

export interface ModeOptionLabel {
  readonly label: string
  readonly description: string
}

export interface EarnFieldsLabels {
  readonly mode: string
  readonly modes: Readonly<Record<ProgramMode, ModeOptionLabel>>
  readonly modeLocked: string
  /** Etiqueta "Travado" no tipo de cartão que não pode mais mudar. */
  readonly modeLockedTag: string
  readonly target: string
  readonly targetHint: string
  readonly targetError: string
  readonly targetChangeNote: string
  readonly pointsPerReal: string
  readonly pointsPerVisit: string
  readonly rateError: string
}

export interface BonusToggleLabel {
  readonly label: string
  readonly description: string
}

export interface BonusFieldsLabels {
  readonly welcome: BonusToggleLabel
  readonly welcomeUnits: string
  readonly birthday: BonusToggleLabel
  readonly referral: BonusToggleLabel
  readonly referralUnits: string
  readonly welcomeUnitsError: string
  readonly referralUnitsError: string
  readonly surprise: BonusToggleLabel
  readonly surpriseDate: string
  readonly surpriseDateError: string
  readonly noStacking: string
}

export interface VisitRulesLabels {
  readonly checkIn: BonusToggleLabel
  readonly cooldown: string
  readonly cooldownHint: string
  readonly cooldownOptions: readonly SelectOption[]
  readonly expiration: string
  readonly expirationHint: string
  readonly expirationOptions: readonly SelectOption[]
  /** Valor salvo fora da lista (veio de outra versão do app). */
  readonly optionError: string
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
  modeLocked: ComputedRef<boolean>
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

export interface ProgramFormLabels {
  limits: ComputedRef<ProgramFieldLimits>
  earn: ComputedRef<EarnFieldsLabels>
  bonus: ComputedRef<BonusFieldsLabels>
  visitRules: ComputedRef<VisitRulesLabels>
  /** Uma linha por seção fechada; null antes do rascunho carregar. */
  summaries: ComputedRef<ProgramSectionSummaries | null>
}
