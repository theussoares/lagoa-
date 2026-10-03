import type { ComputedRef } from 'vue'
import type { MerchantSession } from '#shared/schemas/session'

export interface MerchantSessionControl {
  session: ComputedRef<MerchantSession | null>
  start: (session: MerchantSession) => void
  signOut: () => Promise<void>
}
