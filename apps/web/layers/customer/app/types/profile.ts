import type { SelectOption } from '#layers/ui/app/types/form'
import type { ThemeChoiceLabels, ThemePreference } from '#layers/ui/app/types/theme'
import type { AsyncResultState } from '#layers/core/app/types/asyncResult'
import type { Birthday } from '#shared/schemas/common'
import type { CustomerProfile } from '#shared/schemas/customer'
import type { TransportError } from '#shared/types/errors'

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

export interface BirthdayEditing {
  /** Qual ação está indo para o servidor agora. */
  readonly pending: BirthdayAction | null
  readonly lockedUntil: string | null
  readonly labels: BirthdayFormLabels
  readonly save: (birthday: Birthday | null, action: BirthdayAction) => Promise<void>
}

export interface ProfileScreen {
  readonly state: AsyncResultState<CustomerProfile, TransportError>
  readonly reload: () => Promise<void>
  theme: ThemePreference
  readonly themeLabels: ThemeChoiceLabels
  readonly consentSaving: boolean
  readonly birthday: BirthdayEditing
  readonly exporter: { readonly pending: boolean }
  readonly erasing: boolean
  readonly changeConsent: (granted: boolean) => Promise<void>
  readonly downloadData: () => Promise<void>
  readonly eraseAccount: () => Promise<void>
  readonly signOut: () => Promise<void>
}
