import { MerchantSessionSchema, type MerchantSession } from '#shared/schemas/session'

const STORAGE_KEY = 'lagoa:merchant-session'

export function readStoredMerchantSession(storage: Storage): MerchantSession | null {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (raw === null) return null
    const parsed = MerchantSessionSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export function writeStoredMerchantSession(storage: Storage, session: MerchantSession | null): void {
  try {
    if (session === null) storage.removeItem(STORAGE_KEY)
    else storage.setItem(STORAGE_KEY, JSON.stringify(session))
  } catch {
    // Sem armazenamento (aba privada, bloqueio): a sessão vale só nesta aba.
  }
}
