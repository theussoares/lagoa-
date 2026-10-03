import type { ClubSetupDraft } from '#shared/schemas/onboarding'
import type { ShopCategory, ShopPoster, ShopProfileDraft } from '#shared/schemas/shop'
import type { ProgramMode } from '#shared/schemas/program'
import type { CreateClubError } from '../services/ClubSetupService'
import type { ProgramFieldErrors, ProgramFieldOptions, ProgramPreview } from './program'
import type { CheckInPosterModel } from './poster'
import type { ComputedRef, Ref } from 'vue'

export type ClubSetupStep = 'shop' | 'rules' | 'reward' | 'poster'

/** Etapas com formulário; o cartaz vem depois que o clube foi criado. */
export type ClubSetupFormStep = Exclude<ClubSetupStep, 'poster'>

export type ShopField = 'name' | 'category' | 'neighborhood' | 'addressLine'

export type ShopFieldErrors = Partial<Record<ShopField, true>>

/** Categoria começa vazia: o lojista escolhe, não herda um palpite. */
export type ShopProfileForm = Omit<ShopProfileDraft, 'category'> & { category: ShopCategory | null }

export interface ClubSetupForm {
  shop: ShopProfileForm
  program: ClubSetupDraft['program']
}

export type ClubSetupProgramForm = ClubSetupForm['program']

export interface SetupStepItem {
  readonly key: ClubSetupStep
  readonly state: 'done' | 'current' | 'next'
}

export type ClubSetupSubmitState = { status: 'idle' } | { status: 'creating' } | { status: 'error'; code: CreateClubError['code'] }

export type ClubPosterState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; poster: ShopPoster }

export interface ClubSetup {
  step: Readonly<Ref<ClubSetupStep>>
  form: Ref<ClubSetupForm>
  shopErrors: ComputedRef<ShopFieldErrors>
  programErrors: ComputedRef<ProgramFieldErrors>
  submitState: Readonly<Ref<ClubSetupSubmitState>>
  posterState: Readonly<Ref<ClubPosterState>>
  next: () => void
  back: () => void
  setMode: (mode: ProgramMode) => void
  create: () => Promise<void>
  loadPoster: () => Promise<void>
}

/** O que a página de criar o clube lê: já desembrulhado (sem `.value`), pronto para o template. */
export interface ClubSetupScreen {
  readonly step: ClubSetupStep
  /** Nome digitado, sem espaços nas pontas. */
  readonly shopName: string
  readonly steps: readonly SetupStepItem[]
  /** Rascunho do store: os campos fazem `v-model` direto nele. */
  form: ClubSetupForm
  readonly shopErrors: ShopFieldErrors
  readonly programErrors: ProgramFieldErrors
  readonly fieldOptions: ProgramFieldOptions
  readonly creating: boolean
  readonly submitError: CreateClubError['code'] | null
  readonly preview: ProgramPreview
  readonly posterStatus: ClubPosterState['status']
  readonly poster: CheckInPosterModel | null
  readonly isPending: boolean
  readonly canApprove: boolean
  readonly submitStep: () => Promise<void>
  readonly back: () => void
  readonly setMode: (mode: ProgramMode) => void
  readonly approve: () => Promise<void>
  readonly print: () => void
  readonly retryPoster: () => Promise<void>
}
