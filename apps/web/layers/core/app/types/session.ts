import type { CustomerSession, MerchantSession } from '#shared/schemas/session'

export interface StoredSessions {
  customer: CustomerSession | null
  merchant: MerchantSession | null
}
