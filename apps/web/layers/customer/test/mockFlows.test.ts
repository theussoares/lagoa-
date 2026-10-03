import { describe, expect, it } from 'vitest'
import { EXAMPLE_IDS } from '#layers/core/app/mock'
import { MockAuthService } from '#layers/core/app/services/MockAuthService'
import { anaSession, barbershopSession, cafeSession, makeBackend, staticSession } from '#layers/core/test/fixtures'
import { createMockMerchantServices } from '#layers/merchant/app/services/mock/createMockMerchantServices'
import { LoginCodeSchema } from '#shared/schemas/session'
import { RedemptionCodeSchema } from '#shared/schemas/redemption'
import { CheckInCodeSchema } from '#shared/schemas/shop'
import { BIRTHDAY_CHANGE_COOLDOWN_DAYS, READABLE_CODE_ALPHABET } from '#shared/constants/domain'
import { createMockCustomerServices } from '../app/services/mock/createMockCustomerServices'

function setup() {
  const { backend, clock } = makeBackend()
  return {
    backend,
    clock,
    customer: createMockCustomerServices(backend, staticSession(anaSession)),
    barbershop: createMockMerchantServices(backend, staticSession(barbershopSession)),
    cafe: createMockMerchantServices(backend, staticSession(cafeSession)),
  }
}

function unwrap<T>(result: { ok: true; value: T } | { ok: false; error: { code: string } }): T {
  if (!result.ok) throw new Error(`expected ok, got ${result.error.code}`)
  return result.value
}

describe('wallet', () => {
  it('lists the ready reward first, then the closest cards', async () => {
    const { customer } = setup()
    const cards = unwrap(await customer.wallet.listCards())
    expect(cards.map((card) => [card.shop.name, card.balance, card.target])).toEqual([
      ['Pizzaria Forno a Lenha', 8, 8],
      ['Barbearia Navalha', 8, 10],
      ['Café da Orla', 96, 150],
      ['Pet Amigo', 20, 100],
    ])
  })

  it('never carries a phone number', async () => {
    const { customer } = setup()
    const payload = JSON.stringify([
      await customer.wallet.listCards(),
      await customer.wallet.listActivity(20),
      await customer.wallet.listRewardHistory(20),
    ])
    expect(payload).not.toMatch(/679000000\d\d/)
  })
})

describe('redemption across customer and counter', () => {
  it('runs code request, counter validation and delivery end to end', async () => {
    const { customer, barbershop, backend } = setup()
    const pizzeriaCard = unwrap(await customer.wallet.getCard(EXAMPLE_IDS.shops.pizzeria))
    const redemption = unwrap(await customer.redemption.requestCode(pizzeriaCard.id))
    expect(redemption.code).toHaveLength(6)
    expect([...redemption.code].every((char) => READABLE_CODE_ALPHABET.includes(char))).toBe(true)

    // Mesmo código pedido de novo enquanto válido.
    expect(unwrap(await customer.redemption.requestCode(pizzeriaCard.id)).code).toBe(redemption.code)

    // Outra loja não enxerga o código.
    expect(await barbershop.counter.validateRedemption(redemption.code)).toEqual({
      ok: false,
      error: { code: 'redemptionInvalid' },
    })

    const pizzeria = createMockMerchantServices(backend, staticSession({
      ...barbershopSession,
      shopId: EXAMPLE_IDS.shops.pizzeria,
      shopName: 'Pizzaria Forno a Lenha',
    }))
    const preview = unwrap(await pizzeria.counter.validateRedemption(redemption.code))
    expect(preview).toMatchObject({ rewardTitle: 'Pizza média', maskedPhone: '(67) 9••••-0001' })

    const entry = unwrap(await pizzeria.counter.confirmRedemption(preview.redemptionId))
    expect(entry.kind).toBe('redemption')

    expect(unwrap(await customer.redemption.getRedemption(redemption.id)).status).toBe('redeemed')
    // Boas-vindas ligada: o próximo cartão já começa andado.
    expect(unwrap(await customer.wallet.getCard(EXAMPLE_IDS.shops.pizzeria)).balance).toBe(2)
    expect(await pizzeria.counter.validateRedemption(redemption.code)).toEqual({
      ok: false,
      error: { code: 'redemptionAlreadyUsed' },
    })

    // A aba Prêmios guarda o resgate entregue, sem as visitas no meio.
    const history = unwrap(await customer.wallet.listRewardHistory(20))
    expect(history.map((item) => [item.kind, item.shopName, item.rewardTitle])).toEqual([
      ['redemption', 'Pizzaria Forno a Lenha', 'Pizza média'],
    ])
  })

  it('expires the code after 10 minutes', async () => {
    const { customer, backend, clock } = setup()
    const card = unwrap(await customer.wallet.getCard(EXAMPLE_IDS.shops.pizzeria))
    const redemption = unwrap(await customer.redemption.requestCode(card.id))
    clock.advanceHours(11 / 60)
    const pizzeria = createMockMerchantServices(backend, staticSession({ ...barbershopSession, shopId: EXAMPLE_IDS.shops.pizzeria }))
    expect(await pizzeria.counter.validateRedemption(redemption.code)).toEqual({
      ok: false,
      error: { code: 'redemptionExpired' },
    })
  })

  it('refuses a code for a card that is not ready', async () => {
    const { customer } = setup()
    const card = unwrap(await customer.wallet.getCard(EXAMPLE_IDS.shops.barbershop))
    expect(await customer.redemption.requestCode(card.id)).toEqual({
      ok: false,
      error: { code: 'rewardNotReady', remaining: 2 },
    })
  })
})

describe('check-in', () => {
  it('stamps once and then holds the customer for the cooldown window', async () => {
    const { customer, clock } = setup()
    const first = unwrap(await customer.checkIn.checkIn(EXAMPLE_IDS.checkInCodes.barbershop))
    expect(first.card.balance).toBe(9)

    const blocked = await customer.checkIn.checkIn(EXAMPLE_IDS.checkInCodes.barbershop)
    expect(blocked.ok).toBe(false)
    if (!blocked.ok) expect(blocked.error).toEqual({ code: 'checkInCooldown', availableAt: first.nextCheckInAt })

    clock.advanceHours(4)
    const second = unwrap(await customer.checkIn.checkIn(EXAMPLE_IDS.checkInCodes.barbershop))
    expect(second.card).toMatchObject({ balance: 10, rewardReady: true })
  })

  it('rejects a pending shop and a code no shop owns', async () => {
    const { customer } = setup()
    const invalid = { ok: false, error: { code: 'invalidShopQr' } }
    expect(await customer.checkIn.checkIn(EXAMPLE_IDS.checkInCodes.gym)).toEqual(invalid)
    expect(await customer.checkIn.checkIn(CheckInCodeSchema.parse('XXX222'))).toEqual(invalid)
  })
})

describe('counter by amount', () => {
  it('turns the amount into points on a points-per-real program', async () => {
    const { cafe, customer } = setup()
    const registered = unwrap(await cafe.counter.registerAmount(EXAMPLE_IDS.phones.ana, 5490))
    expect(registered.unitsEarned).toBe(54)
    expect(unwrap(await customer.wallet.getCard(EXAMPLE_IDS.shops.cafe)).balance).toBe(150)
  })
})

describe('merchant customers', () => {
  it('flags customers with no visit for over 30 days as lapsed, masked', async () => {
    const { barbershop } = setup()
    const lapsed = unwrap(await barbershop.customers.listCustomers('lapsed'))
    expect(lapsed.map((row) => [row.firstName, row.maskedPhone])).toEqual([
      ['João', '(67) 9••••-0002'],
      ['Lucas', '(67) 9••••-0005'],
    ])
  })
})

describe('consent', () => {
  it('is explicit and revocable', async () => {
    const { customer } = setup()
    const revoked = unwrap(await customer.profile.setNotificationConsent(false))
    expect(revoked.consent.notifications).toBe(false)
    expect(revoked.consent.updatedAt).not.toBeNull()
  })
})

describe('birthday', () => {
  const HOURS_PER_DAY = 24

  it('sets the first date freely, then locks a new date for the cooldown', async () => {
    const { customer, clock } = setup()
    const saved = unwrap(await customer.profile.updateProfile({ firstName: null, birthday: '10-01' }))
    expect(saved.birthday).toBe('10-01')
    expect(saved.birthdayChangeableAt).not.toBeNull()

    const locked = await customer.profile.updateProfile({ firstName: null, birthday: '10-02' })
    expect(locked).toMatchObject({ ok: false, error: { code: 'birthdayLocked', changeableAt: saved.birthdayChangeableAt } })

    clock.advanceHours(BIRTHDAY_CHANGE_COOLDOWN_DAYS * HOURS_PER_DAY)
    const changed = unwrap(await customer.profile.updateProfile({ firstName: null, birthday: '10-02' }))
    expect(changed.birthday).toBe('10-02')
  })

  it('lets the date go at any time, but removing does not reopen the lock', async () => {
    const { customer } = setup()
    unwrap(await customer.profile.updateProfile({ firstName: null, birthday: '10-01' }))
    const removed = unwrap(await customer.profile.updateProfile({ firstName: null, birthday: null }))
    expect(removed.birthday).toBeNull()
    expect(await customer.profile.updateProfile({ firstName: null, birthday: '10-02' })).toMatchObject({
      ok: false,
      error: { code: 'birthdayLocked' },
    })
  })

  it('saves other fields without touching the lock when the date stays the same', async () => {
    const { customer } = setup()
    unwrap(await customer.profile.updateProfile({ firstName: null, birthday: '10-01' }))
    expect(unwrap(await customer.profile.updateProfile({ firstName: 'Ana', birthday: '10-01' })).firstName).toBe('Ana')
  })
})

describe('auth', () => {
  it('signs in a customer with the mock code and rejects a wrong one', async () => {
    const { backend } = setup()
    const auth = new MockAuthService(backend)
    unwrap(await auth.requestLoginCode(EXAMPLE_IDS.phones.ana))
    expect(await auth.signInCustomer(EXAMPLE_IDS.phones.ana, LoginCodeSchema.parse('000000'))).toEqual({
      ok: false,
      error: { code: 'invalidLoginCode' },
    })
    unwrap(await auth.requestLoginCode(EXAMPLE_IDS.phones.ana))
    expect(unwrap(await auth.signInCustomer(EXAMPLE_IDS.phones.ana, backend.loginCode)).customerId).toBe(
      EXAMPLE_IDS.customers.ana,
    )
  })

  it('signs registered merchants in and sends unknown phones to create a club', async () => {
    const { backend } = setup()
    const auth = new MockAuthService(backend)
    unwrap(await auth.requestLoginCode(EXAMPLE_IDS.phones.barbershopMerchant))
    expect(unwrap(await auth.signInMerchant(EXAMPLE_IDS.phones.barbershopMerchant, backend.loginCode))).toMatchObject({
      kind: 'session',
      session: { shopId: EXAMPLE_IDS.shops.barbershop, shopStatus: 'approved' },
    })
    unwrap(await auth.requestLoginCode(EXAMPLE_IDS.phones.ana))
    const unknown = unwrap(await auth.signInMerchant(EXAMPLE_IDS.phones.ana, backend.loginCode))
    expect(unknown.kind).toBe('signUp')
    expect(JSON.stringify(unknown)).not.toContain(EXAMPLE_IDS.phones.ana)
  })
})

it('keeps RedemptionCodeSchema strict', () => {
  expect(RedemptionCodeSchema.safeParse('abc123').success).toBe(false)
})
