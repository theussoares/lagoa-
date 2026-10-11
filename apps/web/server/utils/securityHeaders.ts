import { BASE_CSP } from './contentSecurityPolicy'

/**
 * Headers de segurança de toda resposta do app e da LP (`routeRules['/**']` nos dois `nuxt.config`).
 *
 * A CSP daqui é a parte fixa. O `script-src` depende do HTML: no app, o plugin `scriptNonce` troca este header por um
 * com o nonce do pedido; na LP pré-renderizada, o `scriptHashes` põe os hashes numa `<meta>`.
 */
export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'Content-Security-Policy': BASE_CSP,
  'X-Frame-Options': 'SAMEORIGIN',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // Câmera só para o leitor de QR do check-in, e só no próprio site.
  'Permissions-Policy': 'camera=(self), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
}
