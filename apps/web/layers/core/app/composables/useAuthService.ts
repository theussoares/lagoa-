import type { AuthService, MerchantAuthService } from '../services/AuthService'

export function useAuthService(): AuthService {
  return useNuxtApp().$auth
}

/** Login do lojista: código no WhatsApp + sessão pelo BFF (ou o mock, com `merchantBackend = mock`). */
export function useMerchantAuthService(): MerchantAuthService {
  return useNuxtApp().$merchantAuth
}
