import { z } from 'zod'
import type { SeenBalances, SeenStamps } from '../types/wallet'

const STORAGE_KEY = 'lagoa:seen-balances'
const SeenSchema = z.record(z.string(), z.number().int().nonnegative())

function read(): SeenBalances {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed = raw === null ? null : SeenSchema.safeParse(JSON.parse(raw))
    return parsed?.success ? parsed.data : {}
  } catch {
    return {}
  }
}

/**
 * Lembra, só neste aparelho, quanto a pessoa já viu de cada cartão. O que chegou
 * depois (balcão, check-in, outra aba) entra com a batida do carimbo.
 */
export function useSeenStamps(): SeenStamps {
  function remember(balances: SeenBalances): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...read(), ...balances }))
    } catch {
      // Sem armazenamento: a batida só repete na próxima visita.
    }
  }

  return { snapshot: read, remember }
}
