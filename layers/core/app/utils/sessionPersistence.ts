import { z } from 'zod'
import { CustomerSessionSchema, MerchantSessionSchema } from '#shared/schemas/session'
import type { CustomerSession, MerchantSession } from '#shared/schemas/session'

const STORAGE_KEY = 'lagoa:sessions'

const StoredSessionsSchema = z.object({
  customer: CustomerSessionSchema.nullable(),
  merchant: MerchantSessionSchema.nullable(),
})

export interface StoredSessions {
  customer: CustomerSession | null
  merchant: MerchantSession | null
}

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
