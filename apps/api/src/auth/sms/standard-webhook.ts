import { createHmac, timingSafeEqual } from 'node:crypto'

const TOLERANCE_SECONDS = 5 * 60
const SECRET_PREFIX = /^v1,whsec_/

/** Assinatura "Standard Webhooks" que o Supabase usa nos Auth Hooks: HMAC-SHA256 de `id.timestamp.corpo`. */
export function isValidWebhook(
  secret: string,
  headers: { id: string | undefined; timestamp: string | undefined; signature: string | undefined },
  rawBody: Buffer,
  now: Date = new Date(),
): boolean {
  const { id, timestamp, signature } = headers
  if (id === undefined || timestamp === undefined || signature === undefined) return false
  const sentAt = Number(timestamp)
  if (!Number.isInteger(sentAt) || Math.abs(now.getTime() / 1000 - sentAt) > TOLERANCE_SECONDS) return false

  const key = Buffer.from(secret.replace(SECRET_PREFIX, ''), 'base64')
  const expected = createHmac('sha256', key).update(`${id}.${timestamp}.`).update(rawBody).digest()
  return signature.split(' ').some((candidate) => {
    const [version, value] = candidate.split(',')
    if (version !== 'v1' || value === undefined) return false
    const received = Buffer.from(value, 'base64')
    return received.length === expected.length && timingSafeEqual(received, expected)
  })
}
