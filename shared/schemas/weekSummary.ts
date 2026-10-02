import { z } from 'zod'
import { WEEK_SUMMARY_DAYS } from '../constants/domain'
import { IsoDateSchema } from './common'

const count = z.number().int().nonnegative()

export const DaySummarySchema = z.object({
  isoDate: IsoDateSchema,
  visits: count,
  newCustomers: count,
  redemptions: count,
})
export type DaySummary = z.infer<typeof DaySummarySchema>

/** Caderneta da semana da loja: só contagens, nenhum cliente identificado. */
export const WeekSummarySchema = z.object({
  /** Do dia mais antigo para hoje; o último é sempre hoje. */
  days: z.array(DaySummarySchema).length(WEEK_SUMMARY_DAYS),
  visits: count,
  /** Clientes diferentes que visitaram na semana. */
  customers: count,
  newCustomers: count,
  redemptions: count,
})
export type WeekSummary = z.infer<typeof WeekSummarySchema>
