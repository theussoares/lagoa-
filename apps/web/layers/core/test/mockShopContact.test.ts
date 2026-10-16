import { describe, expect, it } from 'vitest'
import { EXAMPLE_IDS } from '#layers/core/app/mock'
import { contactOf, saveContact } from '#layers/core/app/mock/handlers/shopContact'
import { toShopSummary } from '#layers/core/app/mock/handlers/queries'
import { PhoneNumberSchema } from '#shared/schemas/phone'
import type { ShopPublicContact } from '#shared/schemas/shop'
import { makeBackend } from './fixtures'

const { shops } = EXAMPLE_IDS
const chat: ShopPublicContact = { kind: 'whatsapp', whatsapp: PhoneNumberSchema.parse('67991234567'), message: 'Oi', ctaLabel: 'Agendar agora' }
const link: ShopPublicContact = { kind: 'url', url: 'https://loja.com/x', ctaLabel: 'Comprar agora' }

describe('mock shop contact', () => {
  it('starts without a button, saves each kind, switches between them and clears', async () => {
    const { backend } = makeBackend()
    expect(await backend.run((ctx) => contactOf(ctx, shops.barbershop))).toEqual({ ok: true, value: { contact: null } })
    expect(await backend.run((ctx) => saveContact(ctx, shops.barbershop, { contact: chat }))).toEqual({ ok: true, value: { contact: chat } })
    expect(await backend.run((ctx) => saveContact(ctx, shops.barbershop, { contact: link }))).toEqual({ ok: true, value: { contact: link } })
    expect(await backend.run((ctx) => saveContact(ctx, shops.barbershop, { contact: null }))).toEqual({ ok: true, value: { contact: null } })
  })

  it('shows the saved button on the customer cards, and only for that shop', async () => {
    const { backend } = makeBackend()
    await backend.run((ctx) => saveContact(ctx, shops.barbershop, { contact: link }))
    const summaries = await backend.run((ctx) =>
      ctx.state.shops.map((shop) => {
        const program = ctx.state.programs.find((item) => item.shopId === shop.id)
        return program === undefined ? null : { id: shop.id, contact: toShopSummary(shop, program).contact }
      }),
    )
    expect(summaries.find((item) => item?.id === shops.barbershop)?.contact).toEqual(link)
    expect(summaries.filter((item) => item?.id !== shops.barbershop && item?.contact !== undefined)).toEqual([])
  })

  it('answers notFound for an unknown shop', async () => {
    const { backend } = makeBackend()
    const unknown = 'shop_nope' as typeof shops.barbershop
    expect(await backend.run((ctx) => saveContact(ctx, unknown, { contact: null }))).toEqual({ ok: false, error: { code: 'notFound', entity: 'shop' } })
  })
})
