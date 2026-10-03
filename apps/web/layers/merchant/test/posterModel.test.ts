import { describe, expect, it } from 'vitest'
import { CheckInCodeSchema } from '#shared/schemas/shop'
import type { Translate } from '#layers/core/app/types/i18n'
import { toCheckInPosterModel } from '../app/utils/posterModel'

const t: Translate = (key, named = {}) => [key, ...Object.entries(named).map(([name, value]) => `${name}=${String(value)}`)].join(' ')

describe('toCheckInPosterModel', () => {
  const poster = {
    shopName: 'Lava-jato Brilho',
    status: 'pending' as const,
    checkInCode: CheckInCodeSchema.parse('GTAKJV'),
    rewardTitle: 'Lavagem grátis',
    unit: 'stamp' as const,
    target: 10,
  }

  it('prints the shop code and a QR for the check-in link on this origin', () => {
    const model = toCheckInPosterModel(poster, 'https://app.lagoa.test', t)
    expect(model.code).toBe('GTAKJV')
    expect(model.headline).toContain('reward=Lavagem grátis')
    expect(model.qr.size).toBeGreaterThan(0)
    expect(model.qr.d.length).toBeGreaterThan(0)
  })

  it('describes the QR without spelling out the link', () => {
    const model = toCheckInPosterModel(poster, 'https://app.lagoa.test', t)
    expect(model.qrLabel).toBe('poster.qrLabel shop=Lava-jato Brilho')
    expect(model.qrLabel).not.toContain('http')
  })
})
