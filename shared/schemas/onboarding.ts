import { z } from 'zod'
import { ProgramDraftSchema } from './program'
import { ShopProfileDraftSchema } from './shop'

/** Tudo do Criar o clube, enviado de uma vez no fim: loja e clube nascem juntos ou nada é criado. */
export const ClubSetupDraftSchema = z.object({
  shop: ShopProfileDraftSchema,
  program: ProgramDraftSchema,
})
export type ClubSetupDraft = z.infer<typeof ClubSetupDraftSchema>
