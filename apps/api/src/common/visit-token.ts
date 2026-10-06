import { createHash, randomBytes } from 'node:crypto'
import { VISIT_TOKEN_BYTES } from '#shared/constants/domain'
import { type VisitToken, VisitTokenSchema } from '#shared/schemas/visitQr'

/** Token opaco do QR da visita: 256 bits de CSPRNG em base64url. Credencial: nunca em log. */
export function generateVisitToken(): VisitToken {
  return VisitTokenSchema.parse(randomBytes(VISIT_TOKEN_BYTES).toString('base64url'))
}

/** SHA-256 basta: o token já tem 256 bits de entropia, não há o que adivinhar nem dicionário (sem HMAC). */
export function hashVisitToken(token: VisitToken): Buffer {
  return createHash('sha256').update(token).digest()
}
