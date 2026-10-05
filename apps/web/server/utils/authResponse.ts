import { setResponseStatus, type H3Event } from 'h3'
import type { AuthErrorCode } from '../types/auth'
import { authErrorStatus } from './authErrors'

/** Corpo de erro no mesmo formato da API (`{ code }`): o front reaproveita `parseDomainError`. */
export function failWith(event: H3Event, code: AuthErrorCode): { code: AuthErrorCode } {
  setResponseStatus(event, authErrorStatus(code))
  return { code }
}
