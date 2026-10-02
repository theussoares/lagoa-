import { z } from 'zod'
import { ShopIdSchema } from './ids'
import { EarnRateSchema, ProgramUnitSchema } from './program'
import { readableCodeSchema } from './common'
import { CHECK_IN_CODE_LENGTH, REWARD_TITLE_MAX_LENGTH } from '../constants/domain'

export const ShopCategorySchema = z.enum([
  'barbershop',
  'beauty',
  'cafe',
  'bakery',
  'pizzeria',
  'restaurant',
  'petShop',
  'gym',
  'other',
])
export type ShopCategory = z.infer<typeof ShopCategorySchema>

export const ShopStatusSchema = z.enum(['pending', 'approved', 'suspended'])
export type ShopStatus = z.infer<typeof ShopStatusSchema>

/** Identifica a loja no check-in: vai no QR do balcão e impresso embaixo dele. */
export const CheckInCodeSchema = readableCodeSchema(CHECK_IN_CODE_LENGTH).brand<'CheckInCode'>()
export type CheckInCode = z.infer<typeof CheckInCodeSchema>

export const ShopSchema = z.object({
  id: ShopIdSchema,
  name: z.string().min(1).max(60),
  category: ShopCategorySchema,
  neighborhood: z.string().min(1),
  addressLine: z.string().min(1),
  status: ShopStatusSchema,
})
export type Shop = z.infer<typeof ShopSchema>

/** O que o cliente vê de uma loja (carteira e Descobrir). */
export const ShopSummarySchema = ShopSchema.pick({
  id: true,
  name: true,
  category: true,
  neighborhood: true,
  addressLine: true,
}).extend({
  program: z.object({
    unit: ProgramUnitSchema,
    target: z.number().int().positive(),
    rewardTitle: z.string().min(1).max(REWARD_TITLE_MAX_LENGTH),
    earnRate: EarnRateSchema,
    /** Unidades que o cartão novo já ganha (0 quando a regra está desligada). */
    welcomeUnits: z.number().int().nonnegative(),
  }),
})
export type ShopSummary = z.infer<typeof ShopSummarySchema>
