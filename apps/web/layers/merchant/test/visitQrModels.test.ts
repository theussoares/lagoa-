import { describe, expect, it } from 'vitest'
import { VisitQrSchema, VisitTokenSchema } from '#shared/schemas/visitQr'
import type { VisitQr } from '#shared/schemas/visitQr'
import { VisitRegisteredSchema } from '#shared/schemas/visit'
import type { Translate } from '#layers/core/app/types/i18n'
import {
  formatCountdown,
  toVisitQrCode,
  toVisitQrDisplayModel,
  toVisitQrIssueText,
  visitQrRemainingSeconds,
} from '../app/utils/visitQrModels'

const t: Translate = (key, named = {}, plural) =>
  [key, ...Object.entries(named).map(([name, value]) => `${name}=${String(value)}`), plural === undefined ? '' : `#${plural}`]
    .filter(Boolean)
    .join(' ')

const CREATED_AT = '2026-10-01T16:00:00.000Z'
const EXPIRES_AT = '2026-10-01T16:05:00.000Z'
const token = VisitTokenSchema.parse('A'.repeat(43))
const NOW = new Date('2026-10-01T16:00:00.000Z')

function visitQr(overrides: Partial<Record<keyof VisitQr, unknown>> = {}): VisitQr {
  return VisitQrSchema.parse({
    id: 'vqr_1',
    visitCode: 'K7M2Q',
    status: 'active',
    earn: { kind: 'visit' },
    createdAt: CREATED_AT,
    expiresAt: EXPIRES_AT,
    claim: null,
    refusal: null,
    ...overrides,
  })
}

function claim() {
  return VisitRegisteredSchema.parse({
    entry: {
      id: 'visit_1',
      shopId: 'shop_barbearia',
      maskedPhone: '(67) 9••••-0374',
      kind: 'visit',
      unit: 'stamp',
      units: 1,
      amountCents: null,
      rewardTitle: null,
      isNewCustomer: false,
      createdAt: '2026-10-01T16:01:00.000Z',
    },
    card: { cardId: 'card_1', unit: 'stamp', balance: 4, target: 10, rewardReady: false },
    unitsEarned: 1,
    welcomeUnits: 0,
  })
}

const qrCode = toVisitQrCode('https://app.test', token)

function display(qr: VisitQr, remainingSeconds = 252) {
  return toVisitQrDisplayModel({ qr, qrCode, remainingSeconds, rewardTitle: 'Corte grátis' }, NOW, t)
}

describe('visitQrRemainingSeconds', () => {
  const expiresAt = EXPIRES_AT
  const created = Date.parse(CREATED_AT)

  it('counts down to the expiry, rounding up so 0 only shows once it expired', () => {
    expect(visitQrRemainingSeconds(expiresAt, created, 0)).toBe(300)
    expect(visitQrRemainingSeconds(expiresAt, created + 299_500, 0)).toBe(1)
    expect(visitQrRemainingSeconds(expiresAt, created + 300_000, 0)).toBe(0)
    expect(visitQrRemainingSeconds(expiresAt, created + 400_000, 0)).toBe(0)
  })

  it('follows the server clock when the counter clock is behind or ahead', () => {
    const localBehind = created - 30_000
    expect(visitQrRemainingSeconds(expiresAt, localBehind, 30_000)).toBe(300)
    const localAhead = created + 60_000
    expect(visitQrRemainingSeconds(expiresAt, localAhead, -60_000)).toBe(300)
    expect(visitQrRemainingSeconds(expiresAt, localAhead, 0)).toBe(240)
  })
})

describe('formatCountdown', () => {
  it('shows minutes and two-digit seconds', () => {
    expect(formatCountdown(252)).toBe('4:12')
    expect(formatCountdown(300)).toBe('5:00')
    expect(formatCountdown(9)).toBe('0:09')
    expect(formatCountdown(0)).toBe('0:00')
  })
})

describe('toVisitQrIssueText', () => {
  it('offers the plain button in the visit modes and while the program loads', () => {
    expect(toVisitQrIssueText(null, 0, t)).toEqual({ issueLabel: 'counter.visitQr.issue', amountHint: undefined, amountPreview: undefined })
    expect(toVisitQrIssueText({ kind: 'visit', unit: 'point', units: 5 }, 0, t).amountHint).toBeUndefined()
  })

  it('explains the rate in the amount mode and names the amount on the button once typed', () => {
    const empty = toVisitQrIssueText({ kind: 'amount', pointsPerReal: 2 }, 0, t)
    expect(empty.issueLabel).toBe('counter.visitQr.issue')
    expect(empty.amountHint).toBe('counter.visitQr.amountHint points=units.point count=2 #2')
    expect(empty.amountPreview).toBeUndefined()
  })

  it('previews the base points of the amount, before any bonus (H-L2)', () => {
    const typed = toVisitQrIssueText({ kind: 'amount', pointsPerReal: 2 }, 2450, t)
    expect(typed.issueLabel).toMatch(/^counter\.visitQr\.issueAmount amount=R\$/)
    expect(typed.amountPreview).toContain('points=units.point count=49 #49')
  })

  it('does not preview an amount that earns nothing', () => {
    const tiny = toVisitQrIssueText({ kind: 'amount', pointsPerReal: 1 }, 50, t)
    expect(tiny.issueLabel).toBe('counter.visitQr.issue')
    expect(tiny.amountPreview).toBeUndefined()
  })
})

describe('toVisitQrDisplayModel', () => {
  it('shows an active QR with the code, the countdown and no receipt', () => {
    const model = display(visitQr())
    expect(model).toMatchObject({
      visitCode: 'K7M2Q',
      status: 'active',
      statusLabel: 'counter.visitQr.status.active',
      countdown: 'counter.visitQr.expiresIn time=4:12',
      refusal: null,
      receipt: null,
    })
    expect(model.qr.d.length).toBeGreaterThan(0)
    expect(model.qrLabel).toMatch(/^counter\.visitQr\.qrLabel time=\d{2}:\d{2}$/)
  })

  it('shows the antifraud refusal while the QR is still active', () => {
    const model = display(
      visitQr({ refusal: { code: 'checkInCooldown', availableAt: '2026-10-01T22:40:00.000Z', refusedAt: '2026-10-01T16:01:00.000Z' } }),
    )
    expect(model.refusal).toBe('counter.visitQr.refused when=checkIn.when.today time=18:40')
    expect(model.status).toBe('active')
  })

  it('drops the countdown and the refusal once the QR is not active anymore', () => {
    const refusal = { code: 'checkInCooldown', availableAt: '2026-10-01T22:40:00.000Z', refusedAt: '2026-10-01T16:01:00.000Z' }
    expect(display(visitQr({ status: 'expired', refusal }), 0)).toMatchObject({ countdown: null, refusal: null, statusLabel: 'counter.visitQr.status.expired' })
    expect(display(visitQr({ status: 'cancelled' })).statusLabel).toBe('counter.visitQr.status.cancelled')
  })

  it('builds the receipt of the customer card when the QR was used, with the masked phone only', () => {
    const model = display(visitQr({ status: 'claimed', claim: claim() }))
    expect(model.statusLabel).toBe('counter.visitQr.status.claimed')
    expect(model.receipt?.key).toBe('visit_1')
    expect(model.receipt?.model.title).toContain('(67) 9••••-0374')
    expect(JSON.stringify(model)).not.toMatch(/\d{10,}/)
  })
})
