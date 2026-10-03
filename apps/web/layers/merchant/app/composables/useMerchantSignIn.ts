import { LOGIN_CODE_RESEND_SECONDS } from '#shared/constants/domain'
import type { PhoneNumber } from '#shared/schemas/phone'
import { LoginCodeSchema } from '#shared/schemas/session'
import type { DomainErrorCode } from '#shared/types/errors'
import { parsePhoneNumber } from '#shared/utils/phone'
import { useClubSetupStore } from '../stores/clubSetup'
import type { MerchantSignInStep, MerchantSignInOutcome, MerchantSignIn } from '../types/signIn'

/** Entrar no painel com o celular da loja + código. O celular fica só em memória. */
export function useMerchantSignIn(): MerchantSignIn {
  const auth = useAuthService()
  const { start } = useMerchantSession()
  const clubSetup = useClubSetupStore()

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

  async function verify(rawCode: string): Promise<MerchantSignInOutcome> {
    if (step.value.name !== 'code' || pending.value) return 'failed'
    const code = LoginCodeSchema.safeParse(rawCode)
    if (!code.success) {
      error.value = 'invalidLoginCode'
      return 'failed'
    }
    pending.value = true
    error.value = null
    const result = await auth.signInMerchant(step.value.phone, code.data)
    pending.value = false
    if (!result.ok) {
      error.value = result.error.code
      return 'failed'
    }
    if (result.value.kind === 'signUp') {
      clubSetup.begin(result.value.ticket, result.value.expiresAt)
      return 'signUp'
    }
    clubSetup.finish()
    start(result.value.session)
    return 'signedIn'
  }

  function changePhone(): void {
    clubSetup.finish()
    step.value = { name: 'phone' }
    error.value = null
  }

  return { step, pending, error, resendIn, requestCode, resendCode, verify, changePhone }
}
