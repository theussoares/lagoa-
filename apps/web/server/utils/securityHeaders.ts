/**
 * Headers de segurança de toda resposta do app e da LP (`routeRules['/**']` nos dois `nuxt.config`).
 *
 * A CSP fecha o que não depende de nonce: ninguém emoldura o site (`frame-ancestors`, clickjacking), nem troca a base
 * dos links, nem injeta plugin ou envia formulário para fora. `script-src` fica de fora de propósito: o SSR do Nuxt
 * põe o payload em `<script>` inline, e liberar isso sem nonce não protegeria nada.
 */
export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'Content-Security-Policy': "frame-ancestors 'self'; base-uri 'self'; object-src 'none'; form-action 'self'",
  'X-Frame-Options': 'SAMEORIGIN',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // Câmera só para o leitor de QR do check-in, e só no próprio site.
  'Permissions-Policy': 'camera=(self), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
}
