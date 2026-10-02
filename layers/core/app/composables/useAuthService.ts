import type { AuthService } from '../services/AuthService'

export function useAuthService(): AuthService {
  return useNuxtApp().$auth
}
