import { errorCodeOf } from '#layers/core/app/utils/errorCode'
import type { ErrorCarrier } from '#layers/core/app/types/error'

/**
 * Sessão vencida em qualquer fonte leva de volta à entrada do app. Dispara só na
 * transição para "alguma fonte com `unauthorized`", como os `watch(unauthorized)` das páginas.
 */
export function useCustomerSessionGuard(source: () => readonly ErrorCarrier[]): void {
  const { signOut } = useCustomerSession()
  const unauthorized = computed(() => source().some((state) => errorCodeOf(state) === 'unauthorized'))

  watch(unauthorized, (value) => {
    if (value) void signOut()
  })
}
