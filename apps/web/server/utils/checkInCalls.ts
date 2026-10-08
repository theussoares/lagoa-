import { ShopJoinRequestSchema } from '#shared/schemas/shop'
import { VisitCodeClaimRequestSchema, VisitQrClaimRequestSchema } from '#shared/schemas/visit'
import type { z } from 'zod'
import type { ApiCall } from '../types/api'

/** A chamada fixa à API para o que o navegador mandou; `null` = fora do contrato (o handler responde com `rejectInput`). */
function callFor<S extends z.ZodType>(schema: S, path: string, input: unknown): ApiCall | null {
  const parsed = schema.safeParse(input)
  return parsed.success ? { method: 'POST', path, body: parsed.data } : null
}

export const shopJoinCall = (input: unknown): ApiCall | null => callFor(ShopJoinRequestSchema, '/shop-join', input)
export const visitTokenClaimCall = (input: unknown): ApiCall | null => callFor(VisitQrClaimRequestSchema, '/check-in', input)
export const visitCodeClaimCall = (input: unknown): ApiCall | null => callFor(VisitCodeClaimRequestSchema, '/check-in/code', input)
