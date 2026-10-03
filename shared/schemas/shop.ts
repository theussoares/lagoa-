import { z } from 'zod'
import { ShopIdSchema } from './ids'
import { EarnRateSchema, ProgramUnitSchema } from './program'
import { readableCodeSchema } from './common'
import {
  CHECK_IN_CODE_LENGTH,
  REWARD_TITLE_MAX_LENGTH,
  SHOP_ADDRESS_MAX_LENGTH,
  SHOP_NAME_MAX_LENGTH,
  SHOP_NEIGHBORHOOD_MAX_LENGTH,
} from '../constants/domain'

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

/** Vitrine da loja no Descobrir. Tudo opcional: o card só mostra o que existe. */
export const ShopShowcaseSchema = z.object({
  imageUrl: z.string().min(1).optional(),
  rating: z.number().min(0).max(5).optional(),
  distanceKm: z.number().nonnegative().optional(),
  openNow: z.boolean().optional(),
})
export type ShopShowcase = z.infer<typeof ShopShowcaseSchema>

export const ShopSchema = z.object({
  id: ShopIdSchema,
  name: z.string().min(1).max(SHOP_NAME_MAX_LENGTH),
  category: ShopCategorySchema,
  neighborhood: z.string().min(1).max(SHOP_NEIGHBORHOOD_MAX_LENGTH),
  addressLine: z.string().min(1).max(SHOP_ADDRESS_MAX_LENGTH),
  status: ShopStatusSchema,
  showcase: ShopShowcaseSchema.optional(),
})
export type Shop = z.infer<typeof ShopSchema>

/** O que o cliente vê de uma loja (carteira e Descobrir). */
export const ShopSummarySchema = ShopSchema.pick({
  id: true,
  name: true,
  category: true,
  neighborhood: true,
  addressLine: true,
  showcase: true,
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

/** O que o lojista preenche na etapa "Loja" do Criar o clube. */
export const ShopProfileDraftSchema = z.object({
  name: z.string().trim().min(1).max(SHOP_NAME_MAX_LENGTH),
  category: ShopCategorySchema,
  neighborhood: z.string().trim().min(1).max(SHOP_NEIGHBORHOOD_MAX_LENGTH),
  addressLine: z.string().trim().min(1).max(SHOP_ADDRESS_MAX_LENGTH),
})
export type ShopProfileDraft = z.infer<typeof ShopProfileDraftSchema>

/** Cartaz do balcão: o QR leva ao check-in desta loja. */
export const ShopPosterSchema = z.object({
  shopName: z.string().min(1),
  status: ShopStatusSchema,
  checkInCode: CheckInCodeSchema,
  rewardTitle: z.string().min(1),
  unit: ProgramUnitSchema,
  target: z.number().int().positive(),
})
export type ShopPoster = z.infer<typeof ShopPosterSchema>
