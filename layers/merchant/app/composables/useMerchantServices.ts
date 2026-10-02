import type { MerchantServices } from '../services/MerchantServices'

export function useMerchantServices(): MerchantServices {
  return useNuxtApp().$merchantServices
}
