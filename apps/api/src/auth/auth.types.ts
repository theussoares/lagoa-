import type { Request } from 'express'
import type { PhoneNumber } from '#shared/schemas/phone'

export interface AuthUser {
  readonly id: string
  readonly email: string | undefined
  /** Celular confirmado por SMS (claim `phone` do JWT); `undefined` em quem entrou por e-mail. */
  readonly phone: PhoneNumber | undefined
}

export type AuthenticatedRequest = Request & { user: AuthUser }
