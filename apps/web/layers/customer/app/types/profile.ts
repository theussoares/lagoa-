import type { SelectOption } from '#layers/ui/app/types/form'

export type BirthdayOption = SelectOption

export interface BirthdayParts {
  readonly day: number | null
  readonly month: number | null
}

export interface BirthdayFormLabels {
  readonly legend: string
  readonly help: string
  readonly day: string
  readonly month: string
  readonly placeholderDay: string
  readonly placeholderMonth: string
  readonly partial: string
  /** "Você pode trocar a data a partir de 2 de out." quando a troca está travada. */
  readonly locked: string | null
  readonly save: string
  readonly remove: string
  readonly removeTitle: string
  readonly removeDescription: string
  readonly removeConfirm: string
  readonly removeCancel: string
}

export type BirthdayAction = 'save' | 'remove'
