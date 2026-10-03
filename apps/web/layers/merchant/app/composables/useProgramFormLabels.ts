import { BONUS_UNITS_MAX, POINTS_RATE_MAX, PROGRAM_TARGET_MAX, PROGRAM_TARGET_MIN, STAMPS_TARGET_MAX } from '#shared/constants/domain'
import { unitOf } from '#shared/domain/programStrategies'
import type { ProgramDraft } from '#shared/schemas/program'
import { COOLDOWN_HOUR_OPTIONS, EXPIRATION_MONTH_OPTIONS } from '../utils/programForm'
import { cooldownLabel, toProgramSummaries } from '../utils/programSummary'
import type { BonusFieldsLabels, EarnFieldsLabels, ProgramFieldLimits, VisitRulesLabels, ProgramFormLabels } from '../types/program'
import type { SelectOption } from '#layers/ui/app/types/form'

const RATE_MIN = 1
const BONUS_UNITS_MIN = 1

/** Monta os textos do editor a partir do rascunho (a unidade e os limites mudam com o modo). */
export function useProgramFormLabels(draft: Readonly<Ref<ProgramDraft | null>>): ProgramFormLabels {
  const { t } = useI18n()
  const translate = useTranslate()

  // Um valor salvo fora da lista (vindo do backend) continua aparecendo no seletor.
  function withCurrent(options: readonly number[], current: number | null): number[] {
    return current === null || options.includes(current) ? [...options] : [...options, current].sort((a, b) => a - b)
  }

  const limits = computed<ProgramFieldLimits>(() => {
    const rules = draft.value?.rules
    const target = rules?.target ?? PROGRAM_TARGET_MIN
    return {
      target: { min: PROGRAM_TARGET_MIN, max: rules?.mode === 'stamps' ? STAMPS_TARGET_MAX : PROGRAM_TARGET_MAX },
      rate: { min: RATE_MIN, max: POINTS_RATE_MAX },
      // Boas-vindas precisam deixar pelo menos uma visita até o prêmio.
      welcomeUnits: { min: BONUS_UNITS_MIN, max: Math.max(BONUS_UNITS_MIN, Math.min(BONUS_UNITS_MAX, target - 1)) },
      referralUnits: { min: BONUS_UNITS_MIN, max: BONUS_UNITS_MAX },
    }
  })

  const earn = computed<EarnFieldsLabels>(() => {
    const rules = draft.value?.rules
    const unit = rules === undefined ? 'stamp' : unitOf(rules)
    const { min: targetMin, max: targetMax } = limits.value.target
    return {
      mode: t('program.earn.mode'),
      modes: {
        stamps: { label: t('program.earn.modes.stamps.label'), description: t('program.earn.modes.stamps.description') },
        pointsPerCurrency: { label: t('program.earn.modes.pointsPerCurrency.label'), description: t('program.earn.modes.pointsPerCurrency.description') },
        pointsPerVisit: { label: t('program.earn.modes.pointsPerVisit.label'), description: t('program.earn.modes.pointsPerVisit.description') },
      },
      modeLocked: t('program.earn.modeLocked'),
      modeLockedTag: t('program.card.locked'),
      target: t(`program.earn.target.${unit}`),
      targetHint: t('program.earn.targetHint', { min: targetMin, max: targetMax }),
      targetError: t('program.errors.range', { min: targetMin, max: targetMax }),
      targetChangeNote: t('program.earn.targetChangeNote'),
      pointsPerReal: t('program.earn.pointsPerReal'),
      pointsPerVisit: t('program.earn.pointsPerVisit'),
      rateError: t('program.errors.range', { ...limits.value.rate }),
    }
  })

  const bonus = computed<BonusFieldsLabels>(() => {
    const unit = draft.value === null ? 'stamp' : unitOf(draft.value.rules)
    const units = (count: number): string => t(`units.${unit}`, { count }, count)
    const welcomeUnits = draft.value?.bonusRules.welcomeBonus.units ?? 0
    const referralUnits = draft.value?.bonusRules.referralBonus.units ?? 0
    return {
      welcome: { label: t('program.bonus.welcome.label'), description: t('program.bonus.welcome.description', { units: units(welcomeUnits) }) },
      welcomeUnits: t(`program.bonus.unitsLabel.${unit}`),
      birthday: { label: t('program.bonus.birthday.label'), description: t('program.bonus.birthday.description') },
      referral: { label: t('program.bonus.referral.label'), description: t('program.bonus.referral.description', { units: units(referralUnits) }) },
      referralUnits: t(`program.bonus.unitsLabel.${unit}`),
      welcomeUnitsError: t('program.errors.welcomeUnits', { ...limits.value.welcomeUnits }),
      referralUnitsError: t('program.errors.range', { ...limits.value.referralUnits }),
      surprise: { label: t('program.bonus.surprise.label'), description: t('program.bonus.surprise.description') },
      surpriseDate: t('program.bonus.surprise.date'),
      surpriseDateError: t('program.errors.surpriseDate'),
      noStacking: t('program.bonus.noStacking'),
    }
  })

  const visitRules = computed<VisitRulesLabels>(() => {
    const cooldown = draft.value?.checkIn.cooldownHours ?? null
    const expiration = draft.value?.expirationPolicy
    const months = expiration?.kind === 'afterInactivity' ? expiration.months : null
    const expirationOptions: SelectOption[] = [
      { label: t('program.visitRules.expirationNever'), value: 'never' },
      ...withCurrent(EXPIRATION_MONTH_OPTIONS, months).map((value) => ({
        label: t('program.visitRules.expirationMonths', { count: value }, value),
        value: String(value),
      })),
    ]
    return {
      checkIn: { label: t('program.visitRules.checkIn.label'), description: t('program.visitRules.checkIn.description') },
      cooldown: t('program.visitRules.cooldown'),
      cooldownHint: t('program.visitRules.cooldownHint'),
      cooldownOptions: withCurrent(COOLDOWN_HOUR_OPTIONS, cooldown).map((value) => ({ label: cooldownLabel(value, translate), value: String(value) })),
      expiration: t('program.visitRules.expiration'),
      expirationHint: t('program.visitRules.expirationHint'),
      expirationOptions,
      optionError: t('program.errors.option'),
    }
  })

  const summaries = computed(() => (draft.value === null ? null : toProgramSummaries(draft.value, translate)))

  return { limits, earn, bonus, visitRules, summaries }
}
