import { LOGIN_CODE_RESEND_SECONDS } from '#shared/constants/domain'
import type { PhoneNumber } from '#shared/schemas/phone'
import { LoginCodeSchema } from '#shared/schemas/session'
import type { DomainErrorCode } from '#shared/types/errors'
import { parsePhoneNumber } from '#shared/utils/phone'
import type { SignInStep, CustomerSignIn } from '../types/signIn'

/** Entrar por celular + código. O celular fica só em memória: nunca em URL nem storage. */
export function useCustomerSignIn(): CustomerSignIn {
  const auth = useAuthService()
  const { profile } = useCustomerServices()
  const { start } = useCustomerSession()

  const step = ref<SignInStep>({ name: 'phone' })
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

  async function verify(rawCode: string, notificationConsent: boolean): Promise<boolean> {
    if (step.value.name !== 'code' || pending.value) return false
    const code = LoginCodeSchema.safeParse(rawCode)
    if (!code.success) {
      error.value = 'invalidLoginCode'
      return false
    }
    pending.value = true
    error.value = null
    const result = await auth.signInCustomer(step.value.phone, code.data)
    if (!result.ok) {
      pending.value = false
      error.value = result.error.code
      return false
    }
    start(result.value)
    // Entrar = aceitar os termos (texto ao lado do botão). Avisos só com o switch ligado.
    if (result.value.isNewCustomer) await profile.acceptTerms()
    if (notificationConsent) await profile.setNotificationConsent(true)
    pending.value = false
    return true
  }

  function changePhone(): void {
    step.value = { name: 'phone' }
    error.value = null
  }

  return { step, pending, error, resendIn, requestCode, resendCode, verify, changePhone }
}
