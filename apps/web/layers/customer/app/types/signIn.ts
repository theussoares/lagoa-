import type { Ref } from 'vue'
import type { PhoneSignInStep } from '#layers/core/app/types/signIn'
import type { DomainErrorCode } from '#shared/types/errors'

/** Telefone, código e, só para número sem cadastro, o nome (e e-mail opcional). */
export type SignInStep = PhoneSignInStep | { name: 'profile' }

/** Resultado de confirmar o código: a tela decide para onde ir. */
export type VerifyOutcome = 'signedIn' | 'signUp' | 'failed'

/** Erro de campo do cadastro (a tela traduz); erros de rede ou da API vão em `error`. */
export type SignUpFieldError = 'firstNameRequired' | 'invalidEmail'

/** Boas-vindas depois de entrar: quem voltou ou quem acabou de criar a conta. `name` vazio = só a saudação. */
export interface SignInGreeting {
  readonly kind: 'back' | 'new'
  readonly name: string | null
}

export interface SignUpDraft {
  firstName: string
  email: string
  notificationConsent: boolean
}

export interface CustomerSignIn {
  step: Readonly<Ref<SignInStep>>
  pending: Readonly<Ref<boolean>>
  error: Readonly<Ref<DomainErrorCode | null>>
  fieldError: Readonly<Ref<SignUpFieldError | null>>
  greeting: Readonly<Ref<SignInGreeting | null>>
  /** Segundos até liberar "Reenviar código" (0 = liberado). */
  resendIn: Readonly<Ref<number>>
  requestCode: (rawPhone: string) => Promise<void>
  resendCode: () => Promise<void>
  verify: (rawCode: string) => Promise<VerifyOutcome>
  signUp: (draft: SignUpDraft) => Promise<boolean>
  changePhone: () => void
}
