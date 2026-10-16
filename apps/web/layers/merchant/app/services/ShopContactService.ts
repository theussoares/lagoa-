import type { ShopContact, ShopContactUpdate } from '#shared/schemas/shop'
import type { ErrorOf, TransportError } from '#shared/types/errors'
import type { Result } from '#shared/types/result'

export type ShopContactError = ErrorOf<'notFound'> | TransportError

/** Botão do card da loja (WhatsApp com mensagem pronta ou link), como aparece nos cards do cliente. */
export interface ShopContactService {
  getContact(): Promise<Result<ShopContact, ShopContactError>>
  saveContact(update: ShopContactUpdate): Promise<Result<ShopContact, ShopContactError>>
}
