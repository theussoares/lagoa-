import { z } from 'zod'
import { RANKING_NAME_MAX_LENGTH, RANKING_NAME_MIN_LENGTH } from '../constants/domain'

/** Ranking do mês da cidade (só quem entrou por escolha). Aparece apelido e posição; nunca celular nem nome completo. */
export const RankingEntrySchema = z.object({
  position: z.number().int().min(1),
  name: z.string(),
  visits: z.number().int().min(1),
  isMe: z.boolean(),
})
export type RankingEntry = z.infer<typeof RankingEntrySchema>

export const RankingSchema = z.object({
  /** `AAAA-MM`, no fuso da cidade. */
  month: z.string().regex(/^\d{4}-\d{2}$/),
  entries: z.array(RankingEntrySchema),
  me: z.object({
    optedIn: z.boolean(),
    /** `null` = fora do ranking (não entrou ou sem visita no mês). */
    position: z.number().int().min(1).nullable(),
    visits: z.number().int().min(0),
    name: z.string().nullable(),
  }),
})
export type Ranking = z.infer<typeof RankingSchema>

const rankingName = z.string().trim().min(RANKING_NAME_MIN_LENGTH).max(RANKING_NAME_MAX_LENGTH)

/** Entrar exige apelido; sair não leva nada e apaga o apelido. */
export const RankingConsentUpdateSchema = z.discriminatedUnion('granted', [
  z.object({ granted: z.literal(true), name: rankingName }),
  z.object({ granted: z.literal(false) }),
])
export type RankingConsentUpdate = z.infer<typeof RankingConsentUpdateSchema>
