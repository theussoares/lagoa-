import type { ShopId } from '#shared/schemas/ids'
import type { ShopContact, ShopContactUpdate } from '#shared/schemas/shop'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok } from '#shared/types/result'
import type { Result } from '#shared/types/result'
import type { MockContext } from './context'
import { findShop } from './queries'

type NotFound = ErrorOf<'notFound'>

/** O botão do card como a API devolve: o da loja ou `null`. */
export function contactOf(ctx: MockContext, shopId: ShopId): Result<ShopContact, NotFound> {
  const shop = findShop(ctx, shopId)
  if (shop === undefined) return err({ code: 'notFound', entity: 'shop' })
  return ok({ contact: shop.contact ?? null })
}

export function saveContact(ctx: MockContext, shopId: ShopId, update: ShopContactUpdate): Result<ShopContact, NotFound> {
  const shop = findShop(ctx, shopId)
  if (shop === undefined) return err({ code: 'notFound', entity: 'shop' })
  ctx.state.shops = ctx.state.shops.map((item) => {
    if (item.id !== shopId) return item
    const { contact: _removed, ...rest } = item
    return update.contact === null ? rest : { ...rest, contact: update.contact }
  })
  return contactOf(ctx, shopId)
}
