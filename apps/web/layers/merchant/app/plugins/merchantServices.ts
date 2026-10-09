import { BffPhoneAuthGateway } from '#layers/core/app/services/BffPhoneAuthGateway'
import { HttpMerchantAuthService } from '#layers/core/app/services/HttpMerchantAuthService'
import { MockAuthService } from '#layers/core/app/services/MockAuthService'
import type { MerchantAuthService } from '#layers/core/app/services/AuthService'
import type { MerchantServices } from '../services/MerchantServices'
import { createHttpMerchantServices } from '../services/http/createHttpMerchantServices'
import { createMockMerchantServices } from '../services/mock/createMockMerchantServices'
import { useMerchantSessionStore } from '../stores/merchantSession'

/**
 * Painel do lojista: `http` (padrão) fala com a API pelo BFF, com o cookie httpOnly; `mock` roda no navegador
 * (testes e demonstração offline). A escolha é `runtimeConfig.public.merchantBackend`.
 */
export default defineNuxtPlugin({
  name: 'lagoa:merchant-services',
  dependsOn: ['lagoa:backend', 'lagoa:mock-backend'],
  setup(nuxtApp): { provide: { merchantAuth: MerchantAuthService; merchantServices: MerchantServices } } {
    if (useRuntimeConfig().public.merchantBackend === 'mock') {
      const sessions = useMerchantSessionStore()
      return {
        provide: {
          merchantAuth: new MockAuthService(nuxtApp.$mockBackend),
          merchantServices: createMockMerchantServices(nuxtApp.$mockBackend, { current: () => sessions.merchant }),
        },
      }
    }
    const gateway = new BffPhoneAuthGateway((input, init) => fetch(input, init))
    return {
      provide: {
        merchantAuth: new HttpMerchantAuthService(gateway, nuxtApp.$api, () => new Date()),
        merchantServices: createHttpMerchantServices(nuxtApp.$api),
      },
    }
  },
})
