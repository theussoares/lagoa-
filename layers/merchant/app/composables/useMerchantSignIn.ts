import { LOGIN_CODE_RESEND_SECONDS } from '#shared/constants/domain'
import type { PhoneNumber } from '#shared/schemas/phone'
import { LoginCodeSchema } from '#shared/schemas/session'
import type { DomainErrorCode } from '#shared/types/errors'
import { parsePhoneNumber } from '#shared/utils/phone'

export type MerchantSignInStep = { name: 'phone' } | { name: 'code'; phone: PhoneNumber }

export interface MerchantSignIn {
  step: Readonly<Ref<MerchantSignInStep>>
  pending: Readonly<Ref<boolean>>
  error: Readonly<Ref<DomainErrorCode | null>>
  resendIn: Readonly<Ref<number>>
  requestCode: (rawPhone: string) => Promise<void>
  resendCode: () => Promise<void>
  verify: (rawCode: string) => Promise<boolean>
  changePhone: () => void
}

/** Entrar no painel com o celular da loja + código. O celular fica só em memória. */
export function useMerchantSignIn(): MerchantSignIn {
  const auth = useAuthService()
  const { start } = useMerchantSession()

  const step = ref<MerchantSignInStep>({ name: 'phone' })
  const pending = ref(false)
  const error = ref<DomainErrorCode | null>(null)
  const { remaining: resendIn, start: startCountdown } = useCountdown()

  async function sendTo(phone: PhoneNumber): Promise<void> {
    pending.value = true
    error.value = null
    const result = await auth.requestLoginCode(phone)
    pending.value = false
    if (!result.ok) {
      error.value = result.error.code
      return
    }
    step.value = { name: 'code', phone }
    startCountdown(LOGIN_CODE_RESEND_SECONDS)
  }

  async function requestCode(rawPhone: string): Promise<void> {
    const phone = parsePhoneNumber(rawPhone)
    if (!phone.ok) {
      error.value = phone.error.code
      return
    }
    await sendTo(phone.value)
  }

  async function resendCode(): Promise<void> {
    if (step.value.name !== 'code' || resendIn.value > 0) return
    await sendTo(step.value.phone)
  }

  async function verify(rawCode: string): Promise<boolean> {
    if (step.value.name !== 'code' || pending.value) return false
    const code = LoginCodeSchema.safeParse(rawCode)
    if (!code.success) {
      error.value = 'invalidLoginCode'
      return false
    }
    pending.value = true
    error.value = null
    const result = await auth.signInMerchant(step.value.phone, code.data)
    pending.value = false
    if (!result.ok) {
      error.value = result.error.code
      return false
    }
    start(result.value)
    return true
  }

  function changePhone(): void {
    step.value = { name: 'phone' }
    error.value = null
  }

  return { step, pending, error, resendIn, requestCode, resendCode, verify, changePhone }
}
