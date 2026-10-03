import type { ComputedRef } from 'vue'
import type { CustomerSession } from '#shared/schemas/session'

export interface CustomerSessionControl {
  session: ComputedRef<CustomerSession | null>
  start: (session: CustomerSession) => void
  signOut: () => Promise<void>
}
