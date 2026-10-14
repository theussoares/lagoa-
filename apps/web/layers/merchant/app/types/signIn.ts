import type { Ref } from 'vue'
import type { PhoneSignInStep } from '#layers/core/app/types/signIn'
import type { OtpChannel } from '#shared/schemas/session'
import type { DomainErrorCode } from '#shared/types/errors'

export type MerchantSignInStep = PhoneSignInStep

/** `signUp`: celular confirmado sem loja; a página leva ao Criar o clube. */
export type MerchantSignInOutcome = 'signedIn' | 'signUp' | 'failed'

export interface MerchantSignIn {
  step: Readonly<Ref<MerchantSignInStep>>
  channel: Ref<OtpChannel>
  pending: Readonly<Ref<boolean>>
  error: Readonly<Ref<DomainErrorCode | null>>
  resendIn: Readonly<Ref<number>>
  requestCode: (rawPhone: string, channel?: OtpChannel) => Promise<void>
  resendCode: () => Promise<void>
  switchChannel: () => Promise<void>
  verify: (rawCode: string) => Promise<MerchantSignInOutcome>
  changePhone: () => void
}
