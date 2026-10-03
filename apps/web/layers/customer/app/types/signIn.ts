import type { Ref } from 'vue'
import type { PhoneSignInStep } from '#layers/core/app/types/signIn'
import type { DomainErrorCode } from '#shared/types/errors'

export type SignInStep = PhoneSignInStep

export interface CustomerSignIn {
  step: Readonly<Ref<SignInStep>>
  pending: Readonly<Ref<boolean>>
  error: Readonly<Ref<DomainErrorCode | null>>
  /** Segundos até liberar "Reenviar código" (0 = liberado). */
  resendIn: Readonly<Ref<number>>
  requestCode: (rawPhone: string) => Promise<void>
  resendCode: () => Promise<void>
  verify: (rawCode: string, notificationConsent: boolean) => Promise<boolean>
  changePhone: () => void
}
