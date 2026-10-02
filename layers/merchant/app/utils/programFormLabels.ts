import type { ProgramMode } from '#shared/schemas/program'

/** Textos prontos das seções do editor; os componentes só desenham. */

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

export interface SelectOption {
  readonly label: string
  readonly value: string
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
