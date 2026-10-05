import { z } from 'zod'
import { WALLET_ACTIVITY_DEFAULT_LIMIT, WALLET_ACTIVITY_MAX_LIMIT } from '#shared/constants/domain'

/** `?limit=` das listas da carteira: o mesmo teto da API, para o BFF não repassar o que ela recusaria. */
export const LimitQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(WALLET_ACTIVITY_MAX_LIMIT).default(WALLET_ACTIVITY_DEFAULT_LIMIT),
})
