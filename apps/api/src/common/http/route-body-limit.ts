import type { RequestHandler } from 'express'
import { json } from 'express'

/** Rota que recebe corpo maior que o padrão (100 kB). O resto da API, inclusive login e hook de SMS, segue com o padrão. */
export const LARGE_JSON_ROUTES: readonly { readonly path: string; readonly limit: string }[] = [
  // Foto da loja em base64: até 1 MB de imagem dá ~1,4 MB de texto.
  { path: '/v1/merchant/shop/photo', limit: '2mb' },
]

/**
 * Parser JSON só nesses caminhos, montado antes do parser global do Nest: ele lê o corpo e o global, vendo o pedido já
 * lido, não lê de novo.
 */
export function largeJsonParsers(): { readonly path: string; readonly handler: RequestHandler }[] {
  return LARGE_JSON_ROUTES.map(({ path, limit }) => ({ path, handler: json({ limit }) }))
}
