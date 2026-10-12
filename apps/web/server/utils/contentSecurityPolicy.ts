import { createHash, randomBytes } from 'node:crypto'

/** O que não depende de nonce: ninguém emoldura o site, troca a base dos links, injeta plugin ou envia formulário para fora. */
export const BASE_CSP = "frame-ancestors 'self'; base-uri 'self'; object-src 'none'; form-action 'self'"

/** O leitor de QR (`qr-scanner`) roda a decodificação num worker criado de um `Blob`. */
const WORKER_SRC = "worker-src 'self' blob:"

const NONCE_BYTES = 16

const SCRIPT_OPEN_RE = /<script\b(?![^>]*\bnonce=)/gi
/** `modulepreload` e `preload as=script` também passam pelo `script-src`; o `strict-dynamic` ignora o `'self'`. */
const SCRIPT_LINK_RE = /<link\b(?=[^>]*\brel="(?:modulepreload|preload)")(?![^>]*\bnonce=)/gi
const INLINE_SCRIPT_RE = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi

export function createNonce(): string {
  return randomBytes(NONCE_BYTES).toString('base64')
}

/**
 * CSP de uma página renderizada por pedido (app). Só roda script com o nonce desta resposta, e o que ele carregar
 * (`strict-dynamic`: os chunks do Vite e o `import()` das rotas). `'self'` só vale para navegador sem CSP 3.
 */
export function nonceContentSecurityPolicy(nonce: string): string {
  return `${BASE_CSP}; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'; ${WORKER_SRC}`
}

/**
 * Põe o nonce em todo `<script>` e `<link>` de script de um pedaço do HTML, e numa `<meta property="csp-nonce">`, de
 * onde o Vite lê o nonce para os `modulepreload` que cria depois.
 */
export function addNonce(html: string, nonce: string): string {
  return html.replace(SCRIPT_OPEN_RE, `<script nonce="${nonce}"`).replace(SCRIPT_LINK_RE, `<link nonce="${nonce}"`)
}

export function nonceMetaTag(nonce: string): string {
  return `<meta property="csp-nonce" nonce="${nonce}">`
}

/**
 * CSP de uma página pré-renderizada (LP): o HTML é o mesmo para todo mundo, então nonce não serve. Todo script inline
 * entra pelo hash do conteúdo (o `importmap` também passa pelo `script-src`, e hash de dado é inócuo); o resto, só do
 * próprio site. Vai numa `<meta>` (o header da LP é fixo no `routeRules`), que precisa vir antes de qualquer script.
 */
export function hashContentSecurityPolicyMeta(html: string): string {
  const hashes = new Set<string>()
  for (const [, attributes = '', body = ''] of html.matchAll(INLINE_SCRIPT_RE)) {
    if (/\bsrc=/i.test(attributes)) continue
    hashes.add(`'sha256-${createHash('sha256').update(body).digest('base64')}'`)
  }
  const sources = ["'self'", ...hashes].join(' ')
  return `<meta http-equiv="Content-Security-Policy" content="script-src ${sources}; ${WORKER_SRC}">`
}
