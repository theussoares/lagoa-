import { ClubSetupDraftSchema } from '#shared/schemas/onboarding'
import type { ClubSetupDraft } from '#shared/schemas/onboarding'
import type { ProgramDraft } from '#shared/schemas/program'
import { ShopProfileDraftSchema } from '#shared/schemas/shop'
import { programFieldErrors } from './programForm'
import type { ProgramField, ProgramFieldErrors } from '../types/program'
import type { ClubSetupStep, ClubSetupFormStep, ShopField, ShopFieldErrors, ShopProfileForm, ClubSetupForm } from '../types/clubSetup'

export const CLUB_SETUP_STEPS: readonly ClubSetupStep[] = ['shop', 'rules', 'reward', 'poster']
const programFieldsByStep: Readonly<Record<Exclude<ClubSetupFormStep, 'shop'>, readonly ProgramField[]>> = {
  rules: ['target', 'pointsPerReal', 'pointsPerVisit', 'cooldownHours', 'expirationMonths'],
  reward: ['rewardTitle', 'welcomeUnits', 'referralUnits', 'surpriseDate'],
}

const STARTER_STAMPS_TARGET = 10
const STARTER_WELCOME_UNITS = 2
const STARTER_MULTIPLIER = 2
const STARTER_REFERRAL_UNITS = 1
const STARTER_EXPIRATION_MONTHS = 6
const STARTER_COOLDOWN_HOURS = 4

/** Ponto de partida do clube: cartão de 10 carimbos com boas-vindas e aniversário em dobro, como o piloto sugere. */
export function emptyClubSetupForm(): ClubSetupForm {
  return {
    shop: { name: '', category: null, neighborhood: '', addressLine: '' },
    program: {
      reward: { title: '' },
      rules: { mode: 'stamps', target: STARTER_STAMPS_TARGET },
      bonusRules: {
        welcomeBonus: { enabled: true, units: STARTER_WELCOME_UNITS },
        birthdayMultiplier: { enabled: true, multiplier: STARTER_MULTIPLIER },
        referralBonus: { enabled: false, units: STARTER_REFERRAL_UNITS },
        surpriseDay: { enabled: false, multiplier: STARTER_MULTIPLIER, date: null },
      },
      expirationPolicy: { kind: 'afterInactivity', months: STARTER_EXPIRATION_MONTHS },
      checkIn: { enabled: true, cooldownHours: STARTER_COOLDOWN_HOURS },
    },
  }
}

function isShopField(value: unknown): value is ShopField {
  return value === 'name' || value === 'category' || value === 'neighborhood' || value === 'addressLine'
}

export function shopFieldErrors(shop: ShopProfileForm): ShopFieldErrors {
  const parsed = ShopProfileDraftSchema.safeParse(shop)
  if (parsed.success) return {}
  const errors: ShopFieldErrors = {}
  for (const issue of parsed.error.issues) {
    const [field] = issue.path
    if (isShopField(field)) errors[field] = true
  }
  return errors
}

/** Erros do programa só das etapas que o lojista já tentou passar: chegar numa etapa não acende erro. */
export function programErrorsForSteps(program: ProgramDraft, steps: ReadonlySet<ClubSetupFormStep>): ProgramFieldErrors {
  const errors = programFieldErrors(program)
  const visible: ProgramFieldErrors = {}
  for (const step of steps) {
    if (step === 'shop') continue
    for (const field of programFieldsByStep[step]) {
      if (errors[field]) visible[field] = true
    }
  }
  return visible
}

export function stepHasErrors(form: ClubSetupForm, step: ClubSetupFormStep): boolean {
  if (step === 'shop') return Object.keys(shopFieldErrors(form.shop)).length > 0
  const errors = programFieldErrors(form.program)
  return programFieldsByStep[step].some((field) => errors[field] === true)
}

/** Primeira etapa com algo a corrigir, para o "Criar o clube" levar o lojista até lá. */
export function firstStepWithErrors(form: ClubSetupForm): ClubSetupFormStep | null {
  const steps: readonly ClubSetupFormStep[] = ['shop', 'rules', 'reward']
  return steps.find((step) => stepHasErrors(form, step)) ?? null
}

export function toClubSetupDraft(form: ClubSetupForm): ClubSetupDraft | null {
  const parsed = ClubSetupDraftSchema.safeParse(form)
  return parsed.success ? parsed.data : null
}
