import { type ShopPublicContact, ShopPublicContactSchema } from '#shared/schemas/shop'

/** As colunas de `shops` que guardam o botão do card; o CHECK do banco garante que combinam com o `ctaKind`. */
export interface ShopContactColumns {
  readonly ctaKind: string | null
  readonly whatsapp: string | null
  readonly whatsappMessage: string | null
  readonly ctaUrl: string | null
  readonly ctaLabel: string | null
}

/** Linha que o CHECK deixaria passar mas o domínio não reconhece vira "sem botão", nunca um erro na tela. */
export function contactFromColumns(columns: ShopContactColumns): ShopPublicContact | null {
  const candidate =
    columns.ctaKind === 'whatsapp'
      ? { kind: 'whatsapp', whatsapp: columns.whatsapp, message: columns.whatsappMessage, ctaLabel: columns.ctaLabel }
      : columns.ctaKind === 'url'
        ? { kind: 'url', url: columns.ctaUrl, ctaLabel: columns.ctaLabel }
        : null
  const parsed = ShopPublicContactSchema.safeParse(candidate)
  return parsed.success ? parsed.data : null
}

export function columnsFromContact(contact: ShopPublicContact | null): ShopContactColumns {
  const none: ShopContactColumns = { ctaKind: null, whatsapp: null, whatsappMessage: null, ctaUrl: null, ctaLabel: null }
  if (contact === null) return none
  if (contact.kind === 'url') return { ...none, ctaKind: 'url', ctaUrl: contact.url, ctaLabel: contact.ctaLabel }
  return { ...none, ctaKind: 'whatsapp', whatsapp: contact.whatsapp, whatsappMessage: contact.message, ctaLabel: contact.ctaLabel }
}
