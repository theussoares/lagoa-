import { z } from 'zod'
import { CustomerSessionSchema, MerchantSessionSchema } from '#shared/schemas/session'
import type { StoredSessions } from '../types/session'

const STORAGE_KEY = 'lagoa:sessions'

const StoredSessionsSchema = z.object({
  customer: CustomerSessionSchema.nullable(),
  merchant: MerchantSessionSchema.nullable(),
}) satisfies z.ZodType<StoredSessions>

const EMPTY: StoredSessions = { customer: null, merchant: null }

/** Cliente e lojista podem estar logados em abas diferentes do mesmo navegador. */
export function readStoredSessions(storage: Storage): StoredSessions {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (raw === null) return EMPTY
    const parsed = StoredSessionsSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : EMPTY
  } catch {
    return EMPTY
  }
}

export function writeStoredSessions(storage: Storage, sessions: StoredSessions): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(sessions))
  } catch {
    // Sem armazenamento (aba privada, bloqueio): a sessão vale só nesta aba.
  }
}
