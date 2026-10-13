import type { ShopId } from '#shared/schemas/ids'
import type { ShopContact, ShopContactUpdate } from '#shared/schemas/shop'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok } from '#shared/types/result'
import type { Result } from '#shared/types/result'
import type { MockContext } from './context'
import { findShop } from './queries'

type NotFound = ErrorOf<'notFound'>

/** O contato como a API devolve: sem WhatsApp, sem texto de botão. */
export function contactOf(ctx: MockContext, shopId: ShopId): Result<ShopContact, NotFound> {
  const shop = findShop(ctx, shopId)
  if (shop === undefined) return err({ code: 'notFound', entity: 'shop' })
  return ok({ whatsapp: shop.contact?.whatsapp ?? null, ctaLabel: shop.contact?.ctaLabel ?? null })
}

/** Mesma regra da API: sem WhatsApp o texto do botão não fica guardado. */
export function saveContact(ctx: MockContext, shopId: ShopId, update: ShopContactUpdate): Result<ShopContact, NotFound> {
  const shop = findShop(ctx, shopId)
  if (shop === undefined) return err({ code: 'notFound', entity: 'shop' })
  const { whatsapp, ctaLabel } = update
  ctx.state.shops = ctx.state.shops.map((item) => {
    if (item.id !== shopId) return item
    const { contact: _removed, ...rest } = item
    return whatsapp === null ? rest : { ...rest, contact: { whatsapp, ctaLabel } }
  })
  return contactOf(ctx, shopId)
}
