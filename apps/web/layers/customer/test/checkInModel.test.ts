import { describe, expect, it } from 'vitest'
import { CheckInResultSchema } from '#shared/schemas/visit'
import type { Translate } from '#layers/core/app/utils/translate'
import { formatCheckInWhen, seenBalanceBefore, toCheckInEarnedModel, toCheckInNotice } from '../app/utils/checkInModel'

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

describe('formatCheckInWhen', () => {
  it.each([
    ['2026-10-02T22:40:00Z', 'checkIn.when.today time=18:40'],
    ['2026-10-03T13:00:00Z', 'checkIn.when.tomorrow time=09:00'],
    ['2026-10-05T13:00:00Z', 'checkIn.when.later date=5 de out. time=09:00'],
  ])('describes %s in the city time zone', (iso, expected) => {
    expect(formatCheckInWhen(iso, now, t)).toBe(expected)
  })

  it('treats 23h local as today even when UTC already turned the day', () => {
    expect(formatCheckInWhen('2026-10-03T03:00:00Z', now, t)).toBe('checkIn.when.today time=23:00')
  })
})

describe('toCheckInNotice', () => {
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
