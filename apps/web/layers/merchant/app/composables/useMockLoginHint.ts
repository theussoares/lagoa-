import { formatPhoneInput } from '#shared/utils/phone'
import { EXAMPLE_IDS } from '#layers/core/app/mock/seed.example'

/** No mock do lojista não sai SMS: a tela de código mostra o código de teste. */
export function useMockLoginHint(): string {
  return useRuntimeConfig().public.merchantBackend === 'mock' ? useNuxtApp().$mockBackend.loginCode : ''
}

/** Celular de teste do lojista (Barbearia de exemplo) para entrar no Balcão. */
export function useMockMerchantPhone(): string {
  if (useRuntimeConfig().public.merchantBackend !== 'mock') return ''
  return formatPhoneInput(EXAMPLE_IDS.phones.barbershopMerchant)
}
