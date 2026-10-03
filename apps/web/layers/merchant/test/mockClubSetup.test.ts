import { describe, expect, it } from 'vitest'
import { SIGN_UP_TICKET_TTL_MINUTES } from '#shared/constants/domain'
import { PhoneNumberSchema } from '#shared/schemas/phone'
import type { MerchantSession, SignUpTicket } from '#shared/schemas/session'
import { MockAuthService } from '#layers/core/app/services/MockAuthService'
import { approveShop } from '#layers/core/app/mock/handlers/onboarding'
import { EXAMPLE_IDS } from '#layers/core/app/mock'
import { findShop } from '#layers/core/app/mock/handlers/queries'
import { anaSession, barbershopSession, makeBackend, staticSession } from '#layers/core/test/fixtures'
import { MerchantIdSchema } from '#shared/schemas/ids'
import { RedemptionCodeSchema } from '#shared/schemas/redemption'
import { createMockCustomerServices } from '#layers/customer/app/services/mock/createMockCustomerServices'
import { createMockMerchantServices } from '../app/services/mock/createMockMerchantServices'
import { emptyClubSetupForm, toClubSetupDraft } from '../app/utils/clubSetupForm'

const MINUTES_PER_HOUR = 60
const newMerchantPhone = PhoneNumberSchema.parse('67900000020')

function validDraft() {
  const form = emptyClubSetupForm()
  form.shop = { name: 'Lava-jato Brilho', category: 'other', neighborhood: 'Centro', addressLine: 'Rua de exemplo, 100' }
  form.program.reward.title = 'Lavagem simples grátis'
  const draft = toClubSetupDraft(form)
  if (draft === null) throw new Error('invalid draft')
  return draft
}

async function setup() {
  const { backend, clock } = makeBackend()
  const auth = new MockAuthService(backend)
  await auth.requestLoginCode(newMerchantPhone)
  const signedIn = await auth.signInMerchant(newMerchantPhone, backend.loginCode)
  if (!signedIn.ok || signedIn.value.kind !== 'signUp') throw new Error('expected a sign-up ticket')
  let session: MerchantSession | null = null
  const merchant = createMockMerchantServices(backend, { current: () => session })
  const customer = createMockCustomerServices(backend, staticSession(anaSession))
  return {
    backend,
    clock,
    auth,
    merchant,
    customer,
    ticket: signedIn.value.ticket,
    signIn: (next: MerchantSession) => {
      session = next
    },
  }
}

async function create(merchant: Awaited<ReturnType<typeof setup>>['merchant'], ticket: SignUpTicket) {
  const created = await merchant.clubSetup.createClub(ticket, validDraft())
  if (!created.ok) throw new Error(created.error.code)
  return created.value
}

describe('mock ClubSetupService', () => {
  it('creates shop, club and merchant together, waiting for network approval', async () => {
    const { merchant, ticket, signIn } = await setup()
    const session = await create(merchant, ticket)
    expect(session).toMatchObject({ role: 'merchant', shopName: 'Lava-jato Brilho', shopStatus: 'pending' })

    signIn(session)
    const poster = await merchant.poster.getPoster()
    expect(poster.ok && poster.value).toMatchObject({ status: 'pending', rewardTitle: 'Lavagem simples grátis', unit: 'stamp', target: 10 })
    const program = await merchant.program.getProgram()
    expect(program.ok && program.value.shopId).toBe(session.shopId)
  })

  it('keeps the counter and check-in closed until the network approves', async () => {
    const { backend, merchant, customer, ticket, signIn } = await setup()
    const session = await create(merchant, ticket)
    signIn(session)
    const poster = await merchant.poster.getPoster()
    if (!poster.ok) throw new Error(poster.error.code)

    expect(await merchant.counter.registerVisit(PhoneNumberSchema.parse('67900000001'))).toEqual({ ok: false, error: { code: 'shopPendingApproval' } })
    expect(await customer.checkIn.checkIn(poster.value.checkInCode)).toEqual({ ok: false, error: { code: 'invalidShopQr' } })

    await backend.run((ctx) => approveShop(ctx, session.shopId))
    expect((await merchant.counter.registerVisit(PhoneNumberSchema.parse('67900000001'))).ok).toBe(true)
  })

  it('signs the new merchant in next time with the shop status', async () => {
    const { backend, auth, merchant, ticket } = await setup()
    const session = await create(merchant, ticket)
    await backend.run((ctx) => approveShop(ctx, session.shopId))
    await auth.requestLoginCode(newMerchantPhone)
    const again = await auth.signInMerchant(newMerchantPhone, backend.loginCode)
    expect(again.ok && again.value).toMatchObject({ kind: 'session', session: { shopId: session.shopId, shopStatus: 'approved' } })
  })

  it('uses the ticket only once', async () => {
    const { merchant, ticket } = await setup()
    await create(merchant, ticket)
    expect(await merchant.clubSetup.createClub(ticket, validDraft())).toEqual({ ok: false, error: { code: 'signUpExpired' } })
  })

  it('refuses an expired ticket', async () => {
    const { clock, merchant, ticket } = await setup()
    clock.advanceHours((SIGN_UP_TICKET_TTL_MINUTES + 1) / MINUTES_PER_HOUR)
    expect(await merchant.clubSetup.createClub(ticket, validDraft())).toEqual({ ok: false, error: { code: 'signUpExpired' } })
  })

  it('validates the whole draft on the server and keeps the ticket for a retry', async () => {
    const { merchant, ticket } = await setup()
    const invalid = { ...validDraft(), shop: { ...validDraft().shop, name: '   ' } }
    expect(await merchant.clubSetup.createClub(ticket, invalid)).toEqual({ ok: false, error: { code: 'invalidClubSetup' } })
    expect((await merchant.clubSetup.createClub(ticket, validDraft())).ok).toBe(true)
  })
})

describe('mock ClubSetupService guards', () => {
  const countAll = (backend: Awaited<ReturnType<typeof setup>>['backend']) =>
    backend.run((ctx) => [ctx.state.shops.length, ctx.state.programs.length, ctx.state.merchants.length])

  it('leaves no shop, club or merchant behind when creation is refused', async () => {
    const { backend, clock, merchant, ticket } = await setup()
    const before = await countAll(backend)
    await merchant.clubSetup.createClub(ticket, { ...validDraft(), shop: { ...validDraft().shop, name: '' } })
    clock.advanceHours((SIGN_UP_TICKET_TTL_MINUTES + 1) / MINUTES_PER_HOUR)
    await merchant.clubSetup.createClub(ticket, validDraft())
    expect(await countAll(backend)).toEqual(before)
  })

  it('keeps only the latest ticket when the phone is confirmed again in another tab', async () => {
    const { auth, backend, merchant, ticket } = await setup()
    await auth.requestLoginCode(newMerchantPhone)
    const again = await auth.signInMerchant(newMerchantPhone, backend.loginCode)
    if (!again.ok || again.value.kind !== 'signUp') throw new Error('expected a sign-up ticket')
    expect(await merchant.clubSetup.createClub(ticket, validDraft())).toEqual({ ok: false, error: { code: 'signUpExpired' } })
    expect((await merchant.clubSetup.createClub(again.value.ticket, validDraft())).ok).toBe(true)
  })

  it('refuses a ticket whose phone already created a shop elsewhere', async () => {
    const { backend, merchant, ticket } = await setup()
    // Outra aba criou a loja com o mesmo celular e um ticket que não é este.
    await backend.run((ctx) => {
      ctx.state.merchants.push({ id: MerchantIdSchema.parse('merchant_other_tab'), phone: newMerchantPhone, shopId: EXAMPLE_IDS.shops.cafe })
    })
    const before = await countAll(backend)
    expect(await merchant.clubSetup.createClub(ticket, validDraft())).toEqual({ ok: false, error: { code: 'signUpExpired' } })
    expect(await countAll(backend)).toEqual(before)
  })

  it('forgets expired tickets and the phone they carried', async () => {
    const { backend, clock } = await setup()
    clock.advanceHours((SIGN_UP_TICKET_TTL_MINUTES + 1) / MINUTES_PER_HOUR)
    expect(await backend.run((ctx) => ctx.state.signUpTickets)).toEqual([])
  })

  it('refuses redemptions and campaigns while the shop waits for approval', async () => {
    const { merchant, ticket, signIn } = await setup()
    signIn(await create(merchant, ticket))
    const pending = { ok: false, error: { code: 'shopPendingApproval' } }
    expect(await merchant.counter.validateRedemption(RedemptionCodeSchema.parse('ABC234'))).toEqual(pending)
    expect(await merchant.campaigns.sendReminder({ message: 'Volte!', bonusUnits: 0 }, 0)).toEqual(pending)
  })
})

describe('suspended shop', () => {
  async function suspendBarbershop() {
    const { backend } = makeBackend()
    await backend.run((ctx) => {
      const shop = findShop(ctx, EXAMPLE_IDS.shops.barbershop)
      if (shop !== undefined) shop.status = 'suspended'
    })
    return { backend, merchant: createMockMerchantServices(backend, staticSession(barbershopSession)) }
  }

  it('cannot sign in, and an old session is refused on every action that touches customers', async () => {
    const { backend, merchant } = await suspendBarbershop()
    const auth = new MockAuthService(backend)
    await auth.requestLoginCode(EXAMPLE_IDS.phones.barbershopMerchant)
    expect(await auth.signInMerchant(EXAMPLE_IDS.phones.barbershopMerchant, backend.loginCode)).toEqual({ ok: false, error: { code: 'shopSuspended' } })

    const suspended = { ok: false, error: { code: 'shopSuspended' } }
    expect(await merchant.counter.registerVisit(EXAMPLE_IDS.phones.ana)).toEqual(suspended)
    expect(await merchant.counter.validateRedemption(RedemptionCodeSchema.parse('ABC234'))).toEqual(suspended)
    expect(await merchant.campaigns.sendReminder({ message: 'Volte!', bonusUnits: 0 }, 1)).toEqual(suspended)
    expect(await merchant.shopStatus.getStatus()).toEqual({ ok: true, value: 'suspended' })
  })
})
