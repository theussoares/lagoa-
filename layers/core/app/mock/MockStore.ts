import { MockStateSchema } from './state'
import type { MockState } from './state'

export interface MockStore {
  load(): MockState | null
  save(state: MockState): void
}

export function memoryMockStore(initial: MockState | null = null): MockStore {
  let state = initial === null ? null : structuredClone(initial)
  return {
    load: () => (state === null ? null : structuredClone(state)),
    save: (next) => {
      state = structuredClone(next)
    },
  }
}

/**
 * Persiste o mock no navegador para o Balcão (uma aba) e a carteira (outra
 * aba) verem o mesmo "servidor". Só para desenvolvimento: use números de
 * teste, nunca um celular real.
 */
export function webStorageMockStore(storage: Storage, key = 'lagoa:mock-backend'): MockStore {
  const fallback = memoryMockStore()
  return {
    load: () => {
      try {
        const raw = storage.getItem(key)
        if (raw === null) return fallback.load()
        const parsed = MockStateSchema.safeParse(JSON.parse(raw))
        return parsed.success ? parsed.data : fallback.load()
      } catch {
        return fallback.load()
      }
    },
    save: (state) => {
      fallback.save(state)
      try {
        storage.setItem(key, JSON.stringify(state))
      } catch {
        // Armazenamento cheio ou bloqueado: o mock segue só em memória nesta aba.
      }
    },
  }
}
