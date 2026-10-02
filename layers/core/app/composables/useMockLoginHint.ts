import { formatPhoneInput } from '#shared/utils/phone'
import { EXAMPLE_IDS } from '../mock/seed.example'

/** No mock não sai SMS: a tela de código mostra o código de teste. Fora do mock, nada. */
export function useMockLoginHint(): string | null {
  const { public: config } = useRuntimeConfig()
  return config.apiMode === 'mock' ? useNuxtApp().$mockBackend.loginCode : null
}

/** Celular de teste do lojista (Barbearia de exemplo) para entrar no Balcão. Fora do mock, nada. */
export function useMockMerchantPhone(): string | null {
  const { public: config } = useRuntimeConfig()
  return config.apiMode === 'mock' ? formatPhoneInput(EXAMPLE_IDS.phones.barbershopMerchant) : null
}
