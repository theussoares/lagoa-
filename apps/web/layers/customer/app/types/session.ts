import type { ComputedRef } from 'vue'
import type { CustomerSession } from '#shared/schemas/session'

export interface CustomerSessionControl {
  session: ComputedRef<CustomerSession | null>
  start: (session: CustomerSession) => void
  /** Pergunta ao servidor quem é a pessoa do cookie, uma vez por carga (vale no SSR e na navegação). */
  restore: () => Promise<CustomerSession | null>
  signOut: () => Promise<void>
}
