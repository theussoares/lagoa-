import { assertMerchantBackendAllowed } from '../utils/merchantBackend'

export default defineNitroPlugin(() => {
  assertMerchantBackendAllowed(useRuntimeConfig().public.merchantBackend, !import.meta.dev)
})
