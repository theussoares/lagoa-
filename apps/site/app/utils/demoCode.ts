import { VISIT_CODE_LENGTH } from '#shared/constants/domain'

const DEMO_CODE_ALPHABET = 'K7M4QRX9T2'

/** Código curto de exemplo, sempre do tamanho real (`VISIT_CODE_LENGTH`) para a demonstração não mentir. */
export function demoVisitCode(): string {
  return Array.from({ length: VISIT_CODE_LENGTH }, (_, index) => DEMO_CODE_ALPHABET[index % DEMO_CODE_ALPHABET.length]).join('')
}
