import { z } from 'zod'
import { IsoDateTimeSchema } from './common'
import { ChallengeIdSchema, ShopIdSchema } from './ids'

/** Desafio da cidade, ex.: "visite 3 lojas novas". */
export const ChallengeSchema = z.object({
  id: ChallengeIdSchema,
  title: z.string().min(1),
  description: z.string().min(1),
  shopIds: z.array(ShopIdSchema).min(1),
  requiredVisits: z.number().int().positive(),
  /** Lojas visitadas dentro da janela do desafio. */
  visitedShopIds: z.array(ShopIdSchema),
  startsAt: IsoDateTimeSchema,
  endsAt: IsoDateTimeSchema.nullable(),
})
export type Challenge = z.infer<typeof ChallengeSchema>
