import { z } from 'zod'
import { REMINDER_BONUS_MIN_UNITS, REMINDER_MESSAGE_MAX_LENGTH } from '../constants/domain'
import { IsoDateTimeSchema } from './common'
import { CampaignIdSchema, ShopIdSchema } from './ids'
import { ProgramUnitSchema } from './program'

export const CampaignKindSchema = z.enum(['lapsedReminder'])
export type CampaignKind = z.infer<typeof CampaignKindSchema>

/** O que o lojista escreve antes de mandar o lembrete. O teto do presente depende do programa (`reminderBonusLimits`). */
export const ReminderDraftSchema = z.object({
  message: z.string().trim().min(1).max(REMINDER_MESSAGE_MAX_LENGTH),
  bonusUnits: z.number().int().min(REMINDER_BONUS_MIN_UNITS),
})
export type ReminderDraft = z.infer<typeof ReminderDraftSchema>

export const ReminderBonusLimitsSchema = z.object({
  min: z.number().int().nonnegative(),
  max: z.number().int().nonnegative(),
  suggested: z.number().int().nonnegative(),
})
export type ReminderBonusLimits = z.infer<typeof ReminderBonusLimitsSchema>

/** Só contagens: a tela de campanha nunca lista quem vai receber (LGPD). */
export const ReminderReachSchema = z.object({
  lapsed: z.number().int().nonnegative(),
  withoutConsent: z.number().int().nonnegative(),
  expired: z.number().int().nonnegative(),
  alreadyReminded: z.number().int().nonnegative(),
  reachable: z.number().int().nonnegative(),
})
export type ReminderReach = z.infer<typeof ReminderReachSchema>

export const CampaignSchema = z.object({
  id: CampaignIdSchema,
  shopId: ShopIdSchema,
  kind: CampaignKindSchema,
  unit: ProgramUnitSchema,
  bonusUnits: z.number().int().nonnegative(),
  message: z.string(),
  recipientsCount: z.number().int().positive(),
  sentAt: IsoDateTimeSchema,
})
export type Campaign = z.infer<typeof CampaignSchema>

export const CampaignOverviewSchema = z.object({
  unit: ProgramUnitSchema,
  bonusLimits: ReminderBonusLimitsSchema,
  reach: ReminderReachSchema,
  /** Mais recente primeiro. */
  history: z.array(CampaignSchema),
})
export type CampaignOverview = z.infer<typeof CampaignOverviewSchema>
