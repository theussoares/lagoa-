import type { ClubSetupDraft } from '#shared/schemas/onboarding'
import type { ShopCategory, ShopPoster, ShopProfileDraft } from '#shared/schemas/shop'
import type { ProgramMode } from '#shared/schemas/program'
import type { CreateClubError } from '../services/ClubSetupService'
import type { ProgramFieldErrors } from './program'
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

export interface SetupStepItem {
  readonly key: string
  readonly label: string
  readonly state: 'done' | 'current' | 'next'
}

export interface ShopFieldsLabels {
  readonly name: string
  readonly namePlaceholder: string
  readonly nameError: string
  readonly category: string
  readonly categoryPlaceholder: string
  readonly categoryError: string
  readonly neighborhood: string
  readonly neighborhoodError: string
  readonly addressLine: string
  readonly addressHint: string
  readonly addressError: string
}

export interface ShopFieldLimits {
  readonly name: number
  readonly neighborhood: number
  readonly addressLine: number
}

export interface PosterStepLabels {
  readonly title: string
  readonly lead: string
  readonly pendingTitle: string
  readonly pendingDescription: string
  readonly approveForTesting: string
  readonly approved: string
  readonly print: string
  readonly goToPanel: string
  readonly loading: string
  readonly loadError: string
  readonly retry: string
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
