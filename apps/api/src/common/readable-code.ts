import { randomInt } from 'node:crypto'
import { READABLE_CODE_ALPHABET } from '#shared/constants/domain'

/** Código aleatório sem caracteres sósia (CSPRNG): resgate, indicação e QR da loja usam o mesmo. */
export function generateReadableCode(length: number): string {
  return Array.from({ length }, () => READABLE_CODE_ALPHABET[randomInt(READABLE_CODE_ALPHABET.length)]).join('')
}
