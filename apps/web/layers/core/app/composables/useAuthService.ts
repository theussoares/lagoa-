import type { AuthService, MerchantAuthService } from '../services/AuthService'

export function useAuthService(): AuthService {
  return useNuxtApp().$auth
}

/** Só no navegador: o login do lojista é o mock. */
export function useMerchantAuthService(): MerchantAuthService {
  return useNuxtApp().$merchantAuth
}
