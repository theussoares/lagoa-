import type { ComputedRef, Ref } from 'vue'
import { BONUS_UNITS_MAX, POINTS_RATE_MAX, PROGRAM_TARGET_MAX, PROGRAM_TARGET_MIN, STAMPS_TARGET_MAX } from '#shared/constants/domain'
import { unitOf } from '#shared/domain/programStrategies'
import type { ProgramDraft } from '#shared/schemas/program'
import type { SelectOption } from '#layers/ui/app/types/form'
import type { Translate } from '#layers/core/app/types/i18n'
import { CALENDAR_DAY_COOLDOWN_VALUE, COOLDOWN_HOUR_OPTIONS, EXPIRATION_MONTH_OPTIONS } from '../utils/programForm'
import { cooldownLabel, toProgramSummaries } from '../utils/programSummary'
import type { ProgramFieldLimits, ProgramFieldOptions } from '../types/program'

const RATE_MIN = 1
const BONUS_UNITS_MIN = 1

// Um valor salvo fora da lista (vindo do backend) continua aparecendo no seletor.
function withCurrent(options: readonly number[], current: number | null): number[] {
  return current === null || options.includes(current) ? [...options] : [...options, current].sort((a, b) => a - b)
}

const HOURS_PER_DAY = 24

/** Horas corridas em ordem, com "1 vez por dia (vira à meia-noite)" logo depois das 24 h. */
function cooldownOptionsOf(draft: ProgramDraft | null, translate: Translate): SelectOption[] {
  const rollingHours = draft?.checkIn.cooldownMode === 'rolling' ? draft.checkIn.cooldownHours : null
  const hours = withCurrent(COOLDOWN_HOUR_OPTIONS, rollingHours).map((value) => ({
    label: cooldownLabel({ cooldownHours: value, cooldownMode: 'rolling' }, translate),
    value: String(value),
  }))
  const calendarDay = { label: cooldownLabel({ cooldownHours: HOURS_PER_DAY, cooldownMode: 'calendarDay' }, translate), value: CALENDAR_DAY_COOLDOWN_VALUE }
  const afterDay = hours.findIndex((option) => Number(option.value) > HOURS_PER_DAY)
  return afterDay === -1 ? [...hours, calendarDay] : [...hours.slice(0, afterDay), calendarDay, ...hours.slice(afterDay)]
}

function limitsOf(draft: ProgramDraft | null): ProgramFieldLimits {
  const rules = draft?.rules
  const target = rules?.target ?? PROGRAM_TARGET_MIN
  return {
    target: { min: PROGRAM_TARGET_MIN, max: rules?.mode === 'stamps' ? STAMPS_TARGET_MAX : PROGRAM_TARGET_MAX },
    rate: { min: RATE_MIN, max: POINTS_RATE_MAX },
    // Boas-vindas precisam deixar pelo menos uma visita até o prêmio.
    welcomeUnits: { min: BONUS_UNITS_MIN, max: Math.max(BONUS_UNITS_MIN, Math.min(BONUS_UNITS_MAX, target - 1)) },
    referralUnits: { min: BONUS_UNITS_MIN, max: BONUS_UNITS_MAX },
  }
}

/** Limites, unidade, opções dos seletores e resumos do editor: mudam com o modo e o rascunho. */
export function useProgramFieldOptions(draft: Readonly<Ref<ProgramDraft | null>>): ComputedRef<ProgramFieldOptions> {
  const { t } = useI18n()
  const translate = useTranslate()

  return computed(() => {
    const current = draft.value
    const months = current?.expirationPolicy.kind === 'afterInactivity' ? current.expirationPolicy.months : null
    const expirationOptions: SelectOption[] = [
      { label: t('program.visitRules.expirationNever'), value: 'never' },
      ...withCurrent(EXPIRATION_MONTH_OPTIONS, months).map((value) => ({
        label: t('program.visitRules.expirationMonths', { count: value }, value),
        value: String(value),
      })),
    ]
    return {
      unit: current === null ? 'stamp' : unitOf(current.rules),
      limits: limitsOf(current),
      cooldownOptions: cooldownOptionsOf(current, translate),
      expirationOptions,
      summaries: current === null ? null : toProgramSummaries(current, translate),
    }
  })
}
