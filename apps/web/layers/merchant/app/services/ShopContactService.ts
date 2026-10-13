import type { ShopContact, ShopContactUpdate } from '#shared/schemas/shop'
import type { ErrorOf, TransportError } from '#shared/types/errors'
import type { Result } from '#shared/types/result'

export type ShopContactError = ErrorOf<'notFound'> | TransportError

/** WhatsApp da loja e o texto do botão que aparece nos cards do cliente. */
export interface ShopContactService {
  getContact(): Promise<Result<ShopContact, ShopContactError>>
  saveContact(update: ShopContactUpdate): Promise<Result<ShopContact, ShopContactError>>
}
