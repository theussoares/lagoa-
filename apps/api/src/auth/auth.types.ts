import type { Request } from 'express'

export interface AuthUser {
  readonly id: string
  readonly email: string | undefined
}

export type AuthenticatedRequest = Request & { user: AuthUser }
