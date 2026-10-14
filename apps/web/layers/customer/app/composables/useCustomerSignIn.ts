import { z } from 'zod'
import { CUSTOMER_FIRST_NAME_MAX_LENGTH, LOGIN_CODE_RESEND_SECONDS } from '#shared/constants/domain'
import type { PhoneNumber } from '#shared/schemas/phone'
import { DEFAULT_OTP_CHANNEL, LoginCodeSchema, type OtpChannel } from '#shared/schemas/session'
import type { DomainErrorCode } from '#shared/types/errors'
import { parsePhoneNumber } from '#shared/utils/phone'
import type { SignInStep, CustomerSignIn, SignInGreeting, SignUpDraft, SignUpFieldError, VerifyOutcome } from '../types/signIn'

const EmailSchema = z.email()

/** Entrar por celular + código; número novo conta o nome antes. O celular fica só em memória: nunca em URL nem storage. */
export function useCustomerSignIn(): CustomerSignIn {
  const auth = useAuthService()
  const { profile } = useCustomerServices()
  const { start } = useCustomerSession()

  const step = ref<SignInStep>({ name: 'phone' })
  const channel = ref<OtpChannel>(DEFAULT_OTP_CHANNEL)
  const pending = ref(false)
  const error = ref<DomainErrorCode | null>(null)
  const fieldError = ref<SignUpFieldError | null>(null)
  const greeting = ref<SignInGreeting | null>(null)
  const { remaining: resendIn, start: startCountdown } = useCountdown()

  async function sendTo(phone: PhoneNumber, targetChannel: OtpChannel = channel.value): Promise<void> {
    pending.value = true
    error.value = null
    const result = await auth.requestLoginCode(phone, targetChannel)
    pending.value = false
    if (!result.ok) {
      error.value = result.error.code
      return
    }
    channel.value = targetChannel
    step.value = { name: 'code', phone, channel: targetChannel }
    startCountdown(LOGIN_CODE_RESEND_SECONDS)
  }

  async function requestCode(rawPhone: string, chosenChannel?: OtpChannel): Promise<void> {
    if (chosenChannel !== undefined) channel.value = chosenChannel
    const phone = parsePhoneNumber(rawPhone)
    if (!phone.ok) {
      error.value = phone.error.code
      return
    }
    await sendTo(phone.value, channel.value)
  }

  async function resendCode(): Promise<void> {
    if (step.value.name !== 'code' || resendIn.value > 0) return
    await sendTo(step.value.phone, step.value.channel)
  }

  async function switchChannel(): Promise<void> {
    if (step.value.name !== 'code' || resendIn.value > 0 || pending.value) return
    const nextChannel: OtpChannel = step.value.channel === 'whatsapp' ? 'sms' : 'whatsapp'
    await sendTo(step.value.phone, nextChannel)
  }

  async function welcomeBack(): Promise<void> {
    const loaded = await profile.getProfile()
    greeting.value = { kind: 'back', name: loaded.ok ? loaded.value.firstName : null }
  }

  async function verify(rawCode: string): Promise<VerifyOutcome> {
    if (step.value.name !== 'code' || pending.value) return 'failed'
    const code = LoginCodeSchema.safeParse(rawCode)
    if (!code.success) {
      error.value = 'invalidLoginCode'
      return 'failed'
    }
    pending.value = true
    error.value = null
    const result = await auth.signInCustomer(step.value.phone, code.data)
    if (!result.ok) {
      pending.value = false
      error.value = result.error.code
      return 'failed'
    }
    if (result.value.kind === 'signUp') {
      step.value = { name: 'profile' }
      pending.value = false
      return 'signUp'
    }
    const { session } = result.value
    start(session)
    // Entrar = aceitar os termos (texto ao lado do botão). Cadastro começado e não terminado ainda não aceitou.
    if (session.isNewCustomer) await profile.acceptTerms()
    await welcomeBack()
    pending.value = false
    return 'signedIn'
  }

  function fieldErrorOf(firstName: string, email: string): SignUpFieldError | null {
    if (firstName.length === 0 || firstName.length > CUSTOMER_FIRST_NAME_MAX_LENGTH) return 'firstNameRequired'
    return email.length > 0 && !EmailSchema.safeParse(email).success ? 'invalidEmail' : null
  }

  async function signUp(draft: SignUpDraft): Promise<boolean> {
    if (step.value.name !== 'profile' || pending.value) return false
    const firstName = draft.firstName.trim()
    const email = draft.email.trim()
    fieldError.value = fieldErrorOf(firstName, email)
    if (fieldError.value !== null) return false
    pending.value = true
    error.value = null
    const result = await auth.registerCustomer({ firstName, ...(email.length > 0 ? { email } : {}) })
    if (!result.ok) {
      pending.value = false
      error.value = result.error.code
      return false
    }
    start(result.value)
    // Criar a conta = aceitar os termos (texto ao lado do botão). Avisos só com o switch ligado.
    await profile.acceptTerms()
    if (draft.notificationConsent) await profile.setNotificationConsent(true)
    greeting.value = { kind: 'new', name: firstName }
    pending.value = false
    return true
  }

  function changePhone(): void {
    step.value = { name: 'phone' }
    error.value = null
    fieldError.value = null
  }

  return { step, channel, pending, error, fieldError, greeting, resendIn, requestCode, resendCode, switchChannel, verify, signUp, changePhone }
}
