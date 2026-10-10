import { VISIT_QR_ACTIVE_MAX_PER_SHOP } from '#shared/constants/domain'
import { describe, expect, it } from 'vitest'
import { EXAMPLE_IDS } from '#layers/core/app/mock'
import { joinShop } from '#layers/core/app/mock/handlers/wallet'
import { updateProgram } from '#layers/core/app/mock/handlers/merchant'
import { cancelVisitQr, getVisitQr, issueVisitQr } from '#layers/core/app/mock/handlers/visitQr'
import { claimVisitQr, simulateVisitQrClaim } from '#layers/core/app/mock/handlers/visitQrClaim'
import { VISIT_QR_TTL_MINUTES } from '#shared/constants/domain'
import { addMinutes } from '#shared/utils/time'
import type { ShopId } from '#shared/schemas/ids'
import type { IssuedVisitQr, VisitQrIssueRequest } from '#shared/schemas/visitQr'
import { makeBackend } from './fixtures'

const { shops, customers, merchants, checkInCodes } = EXAMPLE_IDS

function setup() {
  const { backend, clock } = makeBackend()
  const issue = async (shopId: ShopId = shops.barbershop, request: VisitQrIssueRequest = {}): Promise<IssuedVisitQr> => {
    const result = await backend.run((ctx) => issueVisitQr(ctx, shopId, merchants.barbershop, request))
    if (!result.ok) throw new Error(result.error.code)
    return result.value
  }
  const claim = (customerId: typeof customers.ana, qr: IssuedVisitQr) =>
    backend.run((ctx) => claimVisitQr(ctx, customerId, { kind: 'token', token: qr.token }))
  return { backend, clock, issue, claim }
}

describe('mock visit QR: issue', () => {
  it('issues an opaque 43-char token and a 5-char code that live for the TTL', async () => {
    const { issue } = setup()
    const qr = await issue()
    expect(qr.token).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(qr.visitCode).toHaveLength(5)
    expect(qr.status).toBe('active')
    expect(qr.earn).toEqual({ kind: 'visit' })
    expect(Date.parse(qr.expiresAt) - Date.parse(qr.createdAt)).toBe(VISIT_QR_TTL_MINUTES * 60_000)
  })

  it('never repeats a code among the active QRs and hands out distinct tokens', async () => {
    const { issue } = setup()
    const issued = []
    for (let index = 0; index < VISIT_QR_ACTIVE_MAX_PER_SHOP; index += 1) issued.push(await issue())
    expect(new Set(issued.map((qr) => qr.visitCode)).size).toBe(VISIT_QR_ACTIVE_MAX_PER_SHOP)
    expect(new Set(issued.map((qr) => qr.token)).size).toBe(VISIT_QR_ACTIVE_MAX_PER_SHOP)
  })

  it('keeps the token out of the merchant view', async () => {
    const { backend, issue } = setup()
    const qr = await issue()
    const view = await backend.run((ctx) => getVisitQr(ctx, shops.barbershop, qr.id))
    expect(JSON.stringify(view)).not.toContain(qr.token)
  })
})

describe('mock visit QR: claim', () => {
  it('CA-10 credits one stamp on the existing card and records a visit', async () => {
    const { backend, issue, claim } = setup()
    const qr = await issue()
    const result = await claim(customers.ana, qr)
    if (!result.ok) throw new Error(result.error.code)
    expect(result.value.card).toMatchObject({ balance: 9, target: 10, rewardReady: false })
    expect(result.value.activity).toMatchObject({ kind: 'visit', units: 1 })
    const ledger = await backend.run((ctx) => ctx.state.ledger.find((record) => record.id === result.value.activity.id))
    expect(ledger).toMatchObject({ customerId: customers.ana, shopId: shops.barbershop, amountCents: null })
  })

  it('CA-11 accepts at T0+4:59 and refuses at T0+5:00', async () => {
    const { clock, issue, claim } = setup()
    const start = new Date(clock.now())
    const early = await issue()
    const late = await issue()
    clock.set(new Date(addMinutes(start, VISIT_QR_TTL_MINUTES).getTime() - 1_000))
    expect((await claim(customers.ana, early)).ok).toBe(true)
    clock.set(addMinutes(start, VISIT_QR_TTL_MINUTES))
    expect(await claim(customers.joao, late)).toEqual({ ok: false, error: { code: 'visitQrExpired' } })
  })

  it('CA-14 replays the same result for the same person and refuses another', async () => {
    const { backend, clock, issue, claim } = setup()
    const start = new Date(clock.now())
    const qr = await issue()
    const first = await claim(customers.ana, qr)
    clock.set(addMinutes(start, VISIT_QR_TTL_MINUTES + 1))
    const again = await claim(customers.ana, qr)
    expect(again).toEqual(first)
    expect(await claim(customers.joao, qr)).toEqual({ ok: false, error: { code: 'visitQrAlreadyUsed' } })
    if (!first.ok) throw new Error(first.error.code)
    const rows = await backend.run((ctx) => ctx.state.ledger.filter((record) => record.id === first.value.activity.id))
    expect(rows).toHaveLength(1)
    expect(await backend.run((ctx) => ctx.state.cards.find((card) => card.id === first.value.card.cardId)?.balance)).toBe(9)
  })

  it('CA-15 notes the cooldown refusal without consuming the QR', async () => {
    const { backend, issue, claim } = setup()
    const qr = await issue()
    const refused = await claim(customers.pedro, qr)
    expect(refused).toMatchObject({ ok: false, error: { code: 'checkInCooldown' } })
    const view = await backend.run((ctx) => getVisitQr(ctx, shops.barbershop, qr.id))
    expect(view).toMatchObject({ ok: true, value: { status: 'active', claim: null, refusal: { code: 'checkInCooldown' } } })
    expect((await claim(customers.ana, qr)).ok).toBe(true)
  })

  it('CA-16 answers visitQrStale after the program changes', async () => {
    const { backend, issue, claim } = setup()
    const qr = await issue()
    await backend.run((ctx) => {
      const current = ctx.state.programs.find((program) => program.shopId === shops.barbershop)
      if (current === undefined) throw new Error('seed has no barbershop program')
      const { id: _id, shopId: _shopId, ...draft } = current
      return updateProgram(ctx, shops.barbershop, { ...draft, reward: { title: 'Barba grátis' } })
    })
    expect(await claim(customers.ana, qr)).toEqual({ ok: false, error: { code: 'visitQrStale' } })
  })

  it('CA-17 answers invalidVisitQr when the shop is no longer approved', async () => {
    const { backend, issue, claim } = setup()
    const qr = await issue()
    await backend.run((ctx) => {
      ctx.state.shops = ctx.state.shops.map((shop) => (shop.id === shops.barbershop ? { ...shop, status: 'suspended' } : shop))
    })
    expect(await claim(customers.ana, qr)).toEqual({ ok: false, error: { code: 'invalidVisitQr' } })
  })

  it('CA-18 answers invalidVisitQr for a cancelled QR and for an unknown token', async () => {
    const { backend, issue, claim } = setup()
    const qr = await issue()
    await backend.run((ctx) => cancelVisitQr(ctx, shops.barbershop, qr.id))
    expect(await claim(customers.ana, qr)).toEqual({ ok: false, error: { code: 'invalidVisitQr' } })
    const unknown = { ...qr, token: qr.token.replace(/^./, qr.token.startsWith('A') ? 'B' : 'A') as typeof qr.token }
    expect(await claim(customers.ana, unknown)).toEqual({ ok: false, error: { code: 'invalidVisitQr' } })
  })

  it('claims by the short code, newest QR first', async () => {
    const { backend, issue } = setup()
    const qr = await issue()
    const result = await backend.run((ctx) => claimVisitQr(ctx, customers.ana, { kind: 'visitCode', code: qr.visitCode }))
    expect(result.ok).toBe(true)
  })

  it('creates the card on the first visit with the welcome stamps (RN-13)', async () => {
    const { issue, claim } = setup()
    const qr = await issue(shops.pizzeria)
    const result = await claim(customers.joao, qr)
    if (!result.ok) throw new Error(result.error.code)
    expect(result.value.card).toMatchObject({ balance: 3, unit: 'stamp' })
  })

  it('gives the welcome stamps on the first visit of a card made by joining, not on joining', async () => {
    const { backend, issue, claim } = setup()
    const joined = await backend.run((ctx) => joinShop(ctx, customers.joao, checkInCodes.pizzeria))
    if (!joined.ok) throw new Error(joined.error.code)
    const card = await backend.run((ctx) => ctx.state.cards.find((item) => item.id === joined.value.cardId))
    expect(card).toMatchObject({ balance: 0, lastVisitAt: null })
    const result = await claim(customers.joao, await issue(shops.pizzeria))
    expect(result.ok && result.value.card.balance).toBe(3)
  })

  it('credits the amount for a points-per-real shop and records it in the ledger', async () => {
    const { backend, issue, claim } = setup()
    const qr = await issue(shops.cafe, { amountCents: 3200 })
    const result = await claim(customers.ana, qr)
    if (!result.ok) throw new Error(result.error.code)
    expect(result.value.activity).toMatchObject({ kind: 'amount', units: 32 })
    const ledger = await backend.run((ctx) => ctx.state.ledger.find((record) => record.id === result.value.activity.id))
    expect(ledger?.amountCents).toBe(3200)
  })

  it('shows the claim receipt to the merchant with the masked phone only', async () => {
    const { backend, issue, claim } = setup()
    const qr = await issue()
    await claim(customers.ana, qr)
    const view = await backend.run((ctx) => getVisitQr(ctx, shops.barbershop, qr.id))
    if (!view.ok) throw new Error(view.error.code)
    expect(view.value.status).toBe('claimed')
    expect(view.value.claim?.entry.maskedPhone).toBe('(67) 9••••-0001')
    expect(view.value.claim?.card.balance).toBe(9)
    expect(JSON.stringify(view)).not.toContain('67900000001')
  })
})

describe('mock visit QR: cancel and simulate', () => {
  it('cancels an active QR once and leaves a used one alone (RN-10)', async () => {
    const { backend, issue, claim } = setup()
    const open = await issue()
    const cancelled = await backend.run((ctx) => cancelVisitQr(ctx, shops.barbershop, open.id))
    expect(cancelled).toMatchObject({ ok: true, value: { status: 'cancelled' } })
    expect(await backend.run((ctx) => cancelVisitQr(ctx, shops.barbershop, open.id))).toEqual(cancelled)
    const used = await issue()
    await claim(customers.ana, used)
    expect(await backend.run((ctx) => cancelVisitQr(ctx, shops.barbershop, used.id))).toMatchObject({ ok: true, value: { status: 'claimed' } })
  })

  it('simulates a claim by the first customer outside the cooldown (RN-22)', async () => {
    const { backend, issue } = setup()
    const qr = await issue()
    const view = await backend.run((ctx) => simulateVisitQrClaim(ctx, shops.barbershop, qr.id))
    expect(view).toMatchObject({ ok: true, value: { status: 'claimed', claim: { entry: { maskedPhone: '(67) 9••••-0001' } } } })
  })

  it('treats a QR of another shop as not found', async () => {
    const { backend, issue } = setup()
    const qr = await issue()
    expect(await backend.run((ctx) => getVisitQr(ctx, shops.cafe, qr.id))).toMatchObject({ ok: false, error: { code: 'notFound' } })
  })
})

describe('mock join shop', () => {
  it('CA-01 joins with a blank card, no visit in the ledger, and no cooldown', async () => {
    const { backend } = setup()
    const before = await backend.run((ctx) => ctx.state.ledger.length)
    const result = await backend.run((ctx) => joinShop(ctx, customers.joao, checkInCodes.pizzeria))
    expect(result).toMatchObject({ ok: true, value: { shopId: shops.pizzeria, alreadyMember: false } })
    expect(await backend.run((ctx) => ctx.state.ledger.length)).toBe(before)
    const card = await backend.run((ctx) => ctx.state.cards.find((item) => item.customerId === customers.joao && item.shopId === shops.pizzeria))
    expect(card).toMatchObject({ balance: 0, lastVisitAt: null })
  })

  it('CA-02 is idempotent: the second join returns the same card and writes nothing', async () => {
    const { backend } = setup()
    const first = await backend.run((ctx) => joinShop(ctx, customers.joao, checkInCodes.pizzeria))
    const cards = await backend.run((ctx) => ctx.state.cards.length)
    const second = await backend.run((ctx) => joinShop(ctx, customers.joao, checkInCodes.pizzeria))
    if (!first.ok || !second.ok) throw new Error('join failed')
    expect(second.value).toEqual({ ...first.value, alreadyMember: true })
    expect(await backend.run((ctx) => ctx.state.cards.length)).toBe(cards)
  })

  it('answers a pending shop and an unknown code as invalidShopQr', async () => {
    const { backend } = setup()
    expect(await backend.run((ctx) => joinShop(ctx, customers.joao, checkInCodes.gym))).toEqual({ ok: false, error: { code: 'invalidShopQr' } })
    const unknown = checkInCodes.gym.replace(/^./, 'Z') as typeof checkInCodes.gym
    expect(await backend.run((ctx) => joinShop(ctx, customers.joao, unknown))).toEqual({ ok: false, error: { code: 'invalidShopQr' } })
  })

  it('refuses a new member when the shop does not accept poster entry, but keeps members in', async () => {
    const { backend } = setup()
    await backend.run((ctx) => {
      ctx.state.programs = ctx.state.programs.map((program) =>
        program.shopId === shops.pizzeria ? { ...program, checkIn: { ...program.checkIn, enabled: false } } : program,
      )
    })
    expect(await backend.run((ctx) => joinShop(ctx, customers.joao, checkInCodes.pizzeria))).toEqual({ ok: false, error: { code: 'checkInDisabled' } })
    expect(await backend.run((ctx) => joinShop(ctx, customers.ana, checkInCodes.pizzeria))).toMatchObject({ ok: true, value: { alreadyMember: true } })
  })
})
