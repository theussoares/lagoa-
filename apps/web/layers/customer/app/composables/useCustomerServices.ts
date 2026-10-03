import type { CustomerServices } from '../services/CustomerServices'

export function useCustomerServices(): CustomerServices {
  return useNuxtApp().$customerServices
}
