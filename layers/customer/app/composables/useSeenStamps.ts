import { z } from 'zod'

const STORAGE_KEY = 'lagoa:seen-balances'
const SeenSchema = z.record(z.string(), z.number().int().nonnegative())

type SeenBalances = Readonly<Record<string, number>>

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
export function useSeenStamps(): { snapshot: () => SeenBalances; remember: (balances: SeenBalances) => void } {
  function remember(balances: SeenBalances): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...read(), ...balances }))
    } catch {
      // Sem armazenamento: a batida só repete na próxima visita.
    }
  }

  return { snapshot: read, remember }
}
