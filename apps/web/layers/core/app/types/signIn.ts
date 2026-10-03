import type { PhoneNumber } from '#shared/schemas/phone'

/** Passo do login por celular + código, igual para cliente e lojista. */
export type PhoneSignInStep = { name: 'phone' } | { name: 'code'; phone: PhoneNumber }
