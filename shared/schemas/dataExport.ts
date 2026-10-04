import { z } from 'zod'
import { IsoDateTimeSchema } from './common'
import { CustomerProfileSchema } from './customer'

/** Tudo que o app guarda sobre a pessoa (LGPD, direito de acesso). Celular só mascarado, como no resto da API. */
export const DataExportSchema = z.object({
  exportedAt: IsoDateTimeSchema,
  profile: CustomerProfileSchema,
  cards: z.array(z.object({ shopName: z.string(), balance: z.number().int(), createdAt: IsoDateTimeSchema, lastVisitAt: IsoDateTimeSchema.nullable() })),
  ledger: z.array(z.object({ shopName: z.string(), kind: z.string(), units: z.number().int(), occurredAt: IsoDateTimeSchema })),
  redemptions: z.array(
    z.object({ shopName: z.string(), rewardTitle: z.string(), status: z.string(), createdAt: IsoDateTimeSchema, redeemedAt: IsoDateTimeSchema.nullable() }),
  ),
  referrals: z.object({ pending: z.number().int(), rewarded: z.number().int(), rejected: z.number().int() }),
})
export type DataExport = z.infer<typeof DataExportSchema>
