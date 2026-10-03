import type { Request } from 'express'

export interface AuthUser {
  readonly id: string
}

export type AuthenticatedRequest = Request & { user: AuthUser }
