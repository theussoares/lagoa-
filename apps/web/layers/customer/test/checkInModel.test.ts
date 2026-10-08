import { describe, expect, it } from 'vitest'
import { WalletCardSchema } from '#shared/schemas/loyaltyCard'
import { CheckInResultSchema } from '#shared/schemas/visit'
import type { Translate } from '#layers/core/app/types/i18n'
import { seenBalanceBefore, toCheckInEarnedModel, toCheckInJoinedModel, toCheckInNotice } from '../app/utils/checkInModel'

const t: Translate = (key, named = {}, plural) =>
  [key, ...Object.entries(named).map(([name, value]) => `${name}=${String(value)}`), plural === undefined ? '' : `#${plural}`]
    .filter(Boolean)
    .join(' ')

// 10h em Três Lagoas (UTC−4).
const now = new Date('2026-10-02T14:00:00Z')

const result = CheckInResultSchema.parse({
  activity: {
    id: 'visit_1',
    shopId: 'shop_barbearia',
    shopName: 'Barbearia Navalha',
    kind: 'checkIn',
    unit: 'stamp',
    units: 1,
    rewardTitle: null,
    createdAt: '2026-10-02T14:00:00Z',
  },
  card: { cardId: 'card_1', unit: 'stamp', balance: 9, target: 10, rewardReady: false },
  nextCheckInAt: '2026-10-02T18:00:00Z',
})

describe('toCheckInNotice', () => {
  it('sends a typed code that hit the attempts limit back to the camera instead of offering the same try again', () => {
    expect(toCheckInNotice({ code: 'rateLimited' }, 'typed', now, t)).toMatchObject({ recovery: 'scanAgain' })
    expect(toCheckInNotice({ code: 'rateLimited' }, 'camera', now, t)).toMatchObject({ recovery: 'retry' })
  })

  it('explains the cooldown with the moment it ends and sends the customer to the wallet', () => {
    const notice = toCheckInNotice({ code: 'checkInCooldown', availableAt: '2026-10-02T18:00:00Z' }, 'camera', now, t)
    expect(notice).toMatchObject({ tone: 'warning', recovery: 'wallet', message: 'checkIn.notice.cooldown when=checkIn.when.today time=14:00' })
  })

  it('keeps a wrong typed code on the field instead of a notice', () => {
    expect(toCheckInNotice({ code: 'invalidShopQr' }, 'typed', now, t)).toBeNull()
  })

  it('offers a new scan for a QR that is not a shop', () => {
    expect(toCheckInNotice({ code: 'invalidShopQr' }, 'camera', now, t)).toMatchObject({ tone: 'error', recovery: 'scanAgain' })
  })

  it('explains a disabled shop entrance with the wallet recovery', () => {
    expect(toCheckInNotice({ code: 'checkInDisabled' }, 'camera', now, t)).toMatchObject({
      title: 'checkIn.notice.joinDisabledTitle',
      message: 'errors.checkInDisabled',
      recovery: 'wallet',
    })
  })

  it.each([
    ['invalidVisitQr', 'checkIn.notice.invalidVisitQrTitle'],
    ['visitQrExpired', 'checkIn.notice.visitQrExpiredTitle'],
    ['visitQrAlreadyUsed', 'checkIn.notice.visitQrUsedTitle'],
    ['visitQrStale', 'checkIn.notice.visitQrStaleTitle'],
  ] as const)('asks for a new visit QR on %s, with the scan-again recovery', (code, title) => {
    expect(toCheckInNotice({ code }, 'camera', now, t)).toEqual({
      tone: 'error',
      icon: 'i-ph-qr-code',
      title,
      message: `errors.${code}`,
      recovery: 'scanAgain',
    })
  })

  it('keeps a wrong typed visit code on the field instead of a notice', () => {
    expect(toCheckInNotice({ code: 'invalidVisitQr' }, 'typed', now, t)).toBeNull()
  })

  it.each(['visitQrExpired', 'visitQrAlreadyUsed', 'visitQrStale'] as const)('still shows a notice for a typed code that is %s', (code) => {
    expect(toCheckInNotice({ code }, 'typed', now, t)).toMatchObject({ recovery: 'scanAgain' })
  })

  it('offers a retry when the network fails', () => {
    expect(toCheckInNotice({ code: 'network' }, 'link', now, t)).toMatchObject({ recovery: 'retry' })
  })

  it('leaves an expired session to the sign-out flow', () => {
    expect(toCheckInNotice({ code: 'unauthorized' }, 'camera', now, t)).toBeNull()
  })
})

describe('earned check-in', () => {
  it('only the stamp just earned is fresh', () => {
    expect(seenBalanceBefore(result)).toBe(8)
  })

  it('announces the title with the card summary', () => {
    const model = toCheckInEarnedModel(result, 'Barbearia Navalha: 9 de 10.', now, t)
    expect(model).toEqual({
      moment: 'almost',
      title: 'checkIn.earned.title.stamp',
      lead: 'checkIn.earned.lead units=units.stamp #1',
      cheer: 'checkIn.earned.almost units=units.stamp count=1 #1 #1',
      next: 'checkIn.earned.next when=checkIn.when.today time=14:00',
      announcement:
        'checkIn.earned.announceCheer title=checkIn.earned.title.stamp cheer=checkIn.earned.almost units=units.stamp count=1 #1 #1 summary=Barbearia Navalha: 9 de 10.',
    })
  })

  it('falls back to the title when the card did not load', () => {
    expect(toCheckInEarnedModel({ ...result, card: { ...result.card, balance: 5 } }, null, now, t).announcement).toBe('checkIn.earned.title.stamp')
  })

  it('is a plain stamp when more than one visit is still missing', () => {
    const model = toCheckInEarnedModel({ ...result, card: { ...result.card, balance: 5 } }, null, now, t)
    expect(model).toMatchObject({ moment: 'earned', cheer: null })
  })

  it('celebrates the stamp that frees the reward', () => {
    const model = toCheckInEarnedModel({ ...result, card: { ...result.card, balance: 10, rewardReady: true } }, null, now, t)
    expect(model).toMatchObject({ moment: 'reward', title: 'checkIn.earned.title.reward', cheer: null })
  })

  it('goes back to a plain stamp while the reward waits to be redeemed', () => {
    const model = toCheckInEarnedModel({ ...result, card: { ...result.card, balance: 11, rewardReady: true } }, null, now, t)
    expect(model).toMatchObject({ moment: 'earned', title: 'checkIn.earned.title.stamp', cheer: null })
  })

  it('cheers without a card summary when the card did not load', () => {
    expect(toCheckInEarnedModel(result, null, now, t).announcement).toBe(
      'checkIn.earned.announceCheer title=checkIn.earned.title.stamp cheer=checkIn.earned.almost units=units.stamp count=1 #1 #1 summary=',
    )
  })

  it('counts the plural of what is missing in points mode', () => {
    const points = CheckInResultSchema.parse({
      ...result,
      activity: { ...result.activity, unit: 'point', units: 10 },
      card: { ...result.card, unit: 'point', balance: 95, target: 100 },
    })
    expect(toCheckInEarnedModel(points, null, now, t).cheer).toBe('checkIn.earned.almost units=units.point count=5 #5 #5')
  })
})

describe('joined shop', () => {
  const card = WalletCardSchema.parse({
    id: 'card_1',
    shopId: 'shop_barbearia',
    programId: 'prog_shop_barbearia',
    unit: 'stamp',
    balance: 0,
    target: 10,
    rewardTitle: 'Corte grátis',
    stamps: [],
    lastVisitAt: null,
    rewardExpiresAt: null,
    shop: {
      id: 'shop_barbearia',
      name: 'Barbearia Navalha',
      category: 'barbershop',
      neighborhood: 'Centro',
      addressLine: 'Endereço de exemplo, Centro',
      program: { unit: 'stamp', target: 10, rewardTitle: 'Corte grátis', earnRate: { per: 'visit', units: 1 }, welcomeUnits: 2 },
    },
  })
  const joined = { shopId: card.shopId, cardId: card.id, alreadyMember: false }

  it('welcomes a new member with the shop name, the pending welcome bonus and the next step', () => {
    expect(toCheckInJoinedModel(joined, card, t)).toEqual({
      title: 'checkIn.joined.title',
      lead: 'checkIn.joined.lead shop=Barbearia Navalha',
      welcome: 'checkIn.joined.welcome units=units.stamp #2',
      next: 'checkIn.joined.next',
      announcement: 'checkIn.joined.announce title=checkIn.joined.title lead=checkIn.joined.lead shop=Barbearia Navalha',
    })
  })

  it('says the customer already belonged and keeps the welcome while no visit happened', () => {
    const model = toCheckInJoinedModel({ ...joined, alreadyMember: true }, card, t)
    expect(model.title).toBe('checkIn.joined.titleAgain')
    expect(model.welcome).not.toBeNull()
  })

  it('drops the welcome bonus once there was a visit or when the shop has none', () => {
    expect(toCheckInJoinedModel(joined, { ...card, lastVisitAt: '2026-10-01T10:00:00Z' }, t).welcome).toBeNull()
    const noBonus = { ...card, shop: { ...card.shop, program: { ...card.shop.program, welcomeUnits: 0 } } }
    expect(toCheckInJoinedModel(joined, noBonus, t).welcome).toBeNull()
  })

  it('talks about the shop in general when the card did not load', () => {
    const model = toCheckInJoinedModel(joined, null, t)
    expect(model.lead).toBe('checkIn.joined.leadNoShop')
    expect(model.welcome).toBeNull()
  })
})
