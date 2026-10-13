import { describe, expect, it } from 'vitest'
import { EXAMPLE_IDS } from '#layers/core/app/mock'
import { contactOf, saveContact } from '#layers/core/app/mock/handlers/shopContact'
import { toShopSummary } from '#layers/core/app/mock/handlers/queries'
import { PhoneNumberSchema } from '#shared/schemas/phone'
import { makeBackend } from './fixtures'

const { shops } = EXAMPLE_IDS
const whatsapp = PhoneNumberSchema.parse('67991234567')

describe('mock shop contact', () => {
  it('starts without WhatsApp, saves it with the button text and clears it', async () => {
    const { backend } = makeBackend()
    expect(await backend.run((ctx) => contactOf(ctx, shops.barbershop))).toEqual({ ok: true, value: { whatsapp: null, ctaLabel: null } })
    expect(await backend.run((ctx) => saveContact(ctx, shops.barbershop, { whatsapp, ctaLabel: 'Agendar agora' }))).toEqual({
      ok: true,
      value: { whatsapp, ctaLabel: 'Agendar agora' },
    })
    expect(await backend.run((ctx) => saveContact(ctx, shops.barbershop, { whatsapp: null, ctaLabel: 'Pedir agora' }))).toEqual({
      ok: true,
      value: { whatsapp: null, ctaLabel: null },
    })
  })

  it('shows the saved contact on the customer cards, and only for that shop', async () => {
    const { backend } = makeBackend()
    await backend.run((ctx) => saveContact(ctx, shops.barbershop, { whatsapp, ctaLabel: null }))
    const summaries = await backend.run((ctx) =>
      ctx.state.shops.map((shop) => {
        const program = ctx.state.programs.find((item) => item.shopId === shop.id)
        return program === undefined ? null : { id: shop.id, contact: toShopSummary(shop, program).contact }
      }),
    )
    expect(summaries.find((item) => item?.id === shops.barbershop)?.contact).toEqual({ whatsapp, ctaLabel: null })
    expect(summaries.filter((item) => item?.id !== shops.barbershop && item?.contact !== undefined)).toEqual([])
  })

  it('answers notFound for an unknown shop', async () => {
    const { backend } = makeBackend()
    const unknown = 'shop_nope' as typeof shops.barbershop
    expect(await backend.run((ctx) => saveContact(ctx, unknown, { whatsapp, ctaLabel: null }))).toEqual({ ok: false, error: { code: 'notFound', entity: 'shop' } })
  })
})
