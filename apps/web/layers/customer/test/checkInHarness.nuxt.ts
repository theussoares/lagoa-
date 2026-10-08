import { useNuxtApp } from '#imports'
import { EXAMPLE_IDS } from '#layers/core/app/mock'
import { issueVisitQr } from '#layers/core/app/mock/handlers/visitQr'
import { claimVisitQr } from '#layers/core/app/mock/handlers/visitQrClaim'
import type { ShopId } from '#shared/schemas/ids'
import type { IssuedVisitQr } from '#shared/schemas/visitQr'
import { visitQrLink } from '#shared/utils/checkInCode'

/** O que o Balcão faria na venda: um QR da visita novo no mock, com o token que só o cliente vê. */
export async function issueTestVisitQr(shopId: ShopId = EXAMPLE_IDS.shops.barbershop): Promise<IssuedVisitQr> {
  const issued = await useNuxtApp().$mockBackend.run((ctx) => issueVisitQr(ctx, shopId, EXAMPLE_IDS.merchants.barbershop, {}))
  if (!issued.ok) throw new Error(issued.error.code)
  return issued.value
}

/** Conteúdo do QR da visita, como a câmera do celular o lê. */
export function visitQrContent(qr: IssuedVisitQr): string {
  return visitQrLink('https://app.example', qr.token)
}

/** Outra pessoa usa o QR primeiro (a mesma pessoa de novo seria só repetição do pedido). */
export async function claimAsJoao(qr: IssuedVisitQr): Promise<void> {
  const claimed = await useNuxtApp().$mockBackend.run((ctx) => claimVisitQr(ctx, EXAMPLE_IDS.customers.joao, { kind: 'token', token: qr.token }))
  if (!claimed.ok) throw new Error(claimed.error.code)
}
