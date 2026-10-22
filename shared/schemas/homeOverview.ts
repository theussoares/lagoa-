import { z } from 'zod'
import { IsoDateTimeSchema } from './common'
import { CustomerIdSchema } from './ids'
import { MaskedPhoneSchema } from './phone'
import { ProgramUnitSchema } from './program'

export const HomePeriodSchema = z.enum(['week', 'month', 'last30'])
export type HomePeriod = z.infer<typeof HomePeriodSchema>

export const MetricComparisonSchema = z.object({
  current: z.number().int().nonnegative(),
  previous: z.number().int().nonnegative(),
})
export type MetricComparison = z.infer<typeof MetricComparisonSchema>

export const HomeMetricsSchema = z.object({
  newCustomers: MetricComparisonSchema,
  visits: MetricComparisonSchema,
  purchases: MetricComparisonSchema,
  redemptions: MetricComparisonSchema,
})
export type HomeMetrics = z.infer<typeof HomeMetricsSchema>

export const HomeActivityKindSchema = z.enum([
  'visit',
  'purchase',
  'bonus',
  'rewardReleased',
  'redemption',
])
export type HomeActivityKind = z.infer<typeof HomeActivityKindSchema>

export const HomeActivityItemSchema = z.object({
  id: z.string(),
  kind: HomeActivityKindSchema,
  customerId: CustomerIdSchema,
  name: z.string().nullable(),
  maskedPhone: MaskedPhoneSchema.nullable(),
  units: z.number().int().nonnegative(),
  unit: ProgramUnitSchema,
  amountCents: z.number().int().nonnegative().nullable(),
  rewardTitle: z.string().nullable(),
  createdAt: IsoDateTimeSchema,
})
export type HomeActivityItem = z.infer<typeof HomeActivityItemSchema>

export const HomeOverviewSchema = z.object({
  lapsed: z.object({
    total: z.number().int().nonnegative(),
    oldestLastVisitAt: IsoDateTimeSchema.nullable(),
  }),
  nearReward: z.object({
    total: z.number().int().nonnegative(),
  }),
  rewardReady: z.object({
    total: z.number().int().nonnegative(),
  }),
  totalCustomers: z.number().int().nonnegative(),
  comparison: z.record(HomePeriodSchema, HomeMetricsSchema),
  activity: z.array(HomeActivityItemSchema),
})
export type HomeOverview = z.infer<typeof HomeOverviewSchema>
