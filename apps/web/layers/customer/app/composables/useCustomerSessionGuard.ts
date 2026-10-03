import { errorCodeOf } from '#layers/core/app/utils/errorCode'
import type { ErrorCarrier } from '#layers/core/app/types/error'

/** Sessão vencida em qualquer fonte leva de volta à entrada do app. */
export function useCustomerSessionGuard(source: () => readonly ErrorCarrier[]): void {
  const { signOut } = useCustomerSession()

  watch(
    () => source().map(errorCodeOf),
    (codes) => {
      if (codes.includes('unauthorized')) void signOut()
    },
  )
}
