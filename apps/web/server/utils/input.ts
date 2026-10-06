import { getQuery, getRouterParam, readBody, type H3Event } from 'h3'
import { z } from 'zod'

/** Entrada do navegador já validada; `null` = inválida (o handler responde com `rejectInput`). */
const UuidSchema = z.uuid()

export function uuidParam(event: H3Event, name: string): string | null {
  const parsed = UuidSchema.safeParse(getRouterParam(event, name))
  return parsed.success ? parsed.data : null
}

export function parsedQuery<S extends z.ZodType>(event: H3Event, schema: S): z.infer<S> | null {
  const parsed = schema.safeParse(getQuery(event))
  return parsed.success ? parsed.data : null
}

export async function parsedBody<S extends z.ZodType>(event: H3Event, schema: S): Promise<z.infer<S> | null> {
  const parsed = schema.safeParse(await readBody(event).catch(() => undefined))
  return parsed.success ? parsed.data : null
}
