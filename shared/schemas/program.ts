import { z } from 'zod'
import { IsoDateSchema } from './common'
import { ProgramIdSchema, ShopIdSchema } from './ids'
import {
  BONUS_UNITS_MAX,
  CHECK_IN_COOLDOWN_MAX_HOURS,
  EXPIRATION_MAX_MONTHS,
  PROGRAM_TARGET_MAX,
  PROGRAM_TARGET_MIN,
  POINTS_RATE_MAX,
  REWARD_TITLE_MAX_LENGTH,
  STAMPS_TARGET_MAX,
} from '../constants/domain'

const target = z.number().int().min(PROGRAM_TARGET_MIN).max(PROGRAM_TARGET_MAX)

export const StampsRulesSchema = z.object({
  mode: z.literal('stamps'),
  target: target.max(STAMPS_TARGET_MAX),
})

export const PointsPerCurrencyRulesSchema = z.object({
  mode: z.literal('pointsPerCurrency'),
  pointsPerReal: z.number().int().min(1).max(POINTS_RATE_MAX),
  target,
})

export const PointsPerVisitRulesSchema = z.object({
  mode: z.literal('pointsPerVisit'),
  pointsPerVisit: z.number().int().min(1).max(POINTS_RATE_MAX),
  target,
})

export const ProgramRulesSchema = z.discriminatedUnion('mode', [
  StampsRulesSchema,
  PointsPerCurrencyRulesSchema,
  PointsPerVisitRulesSchema,
])
export type ProgramRules = z.infer<typeof ProgramRulesSchema>
export type ProgramMode = ProgramRules['mode']
export type ProgramRulesByMode = {
  stamps: z.infer<typeof StampsRulesSchema>
  pointsPerCurrency: z.infer<typeof PointsPerCurrencyRulesSchema>
  pointsPerVisit: z.infer<typeof PointsPerVisitRulesSchema>
}

export const ProgramUnitSchema = z.enum(['stamp', 'point'])
export type ProgramUnit = z.infer<typeof ProgramUnitSchema>

/** Como o cliente ganha: "1 carimbo por visita", "1 ponto por real". */
export const EarnRateSchema = z.object({
  per: z.enum(['visit', 'real']),
  units: z.number().int().positive(),
})
export type EarnRate = z.infer<typeof EarnRateSchema>

const toggle = z.object({ enabled: z.boolean() })

export const BonusRulesSchema = z.object({
  welcomeBonus: toggle.extend({ units: z.number().int().min(1).max(BONUS_UNITS_MAX) }),
  birthdayMultiplier: toggle.extend({ multiplier: z.literal(2) }),
  referralBonus: toggle.extend({ units: z.number().int().min(1).max(BONUS_UNITS_MAX) }),
  surpriseDay: toggle.extend({ multiplier: z.literal(2), date: IsoDateSchema.nullable() }),
})
export type BonusRules = z.infer<typeof BonusRulesSchema>

export const ExpirationPolicySchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('never') }),
  z.object({ kind: z.literal('afterInactivity'), months: z.number().int().min(1).max(EXPIRATION_MAX_MONTHS) }),
])
export type ExpirationPolicy = z.infer<typeof ExpirationPolicySchema>

/**
 * Como a janela antifraude conta: `rolling` = `cooldownHours` corridas desde a última visita; `calendarDay` = uma
 * visita por dia local do piloto, que vira à meia-noite (23h e 3h do dia seguinte valem duas). No `calendarDay` as horas
 * ficam guardadas, mas não contam.
 */
export const CheckInCooldownModeSchema = z.enum(['rolling', 'calendarDay'])
export type CheckInCooldownMode = z.infer<typeof CheckInCooldownModeSchema>

export const CheckInPolicySchema = z.object({
  enabled: z.boolean(),
  cooldownHours: z.number().int().min(1).max(CHECK_IN_COOLDOWN_MAX_HOURS),
  // Padrão `rolling`: resposta de uma API que ainda não manda o campo continua valendo como antes.
  cooldownMode: CheckInCooldownModeSchema.default('rolling'),
})
export type CheckInPolicy = z.infer<typeof CheckInPolicySchema>
/** O que a regra antifraude precisa saber da política. */
export type CheckInCooldown = Pick<CheckInPolicy, 'cooldownHours' | 'cooldownMode'>

export const RewardSchema = z.object({
  title: z.string().trim().min(1).max(REWARD_TITLE_MAX_LENGTH),
})

export const ProgramSchema = z.object({
  id: ProgramIdSchema,
  shopId: ShopIdSchema,
  reward: RewardSchema,
  rules: ProgramRulesSchema,
  bonusRules: BonusRulesSchema,
  expirationPolicy: ExpirationPolicySchema,
  checkIn: CheckInPolicySchema,
})
export type Program = z.infer<typeof ProgramSchema>

/**
 * O que o lojista edita em "Programa e prêmios". As regras que cruzam campos
 * ficam aqui para valerem igual no front e no servidor.
 */
export const ProgramDraftSchema = ProgramSchema.omit({ id: true, shopId: true }).superRefine((draft, ctx) => {
  const { welcomeBonus, surpriseDay } = draft.bonusRules
  // Boas-vindas do tamanho da meta dariam o prêmio sem nenhuma visita.
  if (welcomeBonus.enabled && welcomeBonus.units >= draft.rules.target) {
    ctx.addIssue({ code: 'custom', path: ['bonusRules', 'welcomeBonus', 'units'], message: 'welcomeReachesTarget' })
  }
  // Dia surpresa ligado sem data nunca dobraria nada.
  if (surpriseDay.enabled && surpriseDay.date === null) {
    ctx.addIssue({ code: 'custom', path: ['bonusRules', 'surpriseDay', 'date'], message: 'surpriseDateMissing' })
  }
})
export type ProgramDraft = z.infer<typeof ProgramDraftSchema>
