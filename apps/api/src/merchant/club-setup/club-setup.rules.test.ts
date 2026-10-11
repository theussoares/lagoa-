import { describe, expect, it } from 'vitest'
import type { ClubSetupDraft } from '#shared/schemas/onboarding'
import { mapDraftToProgramInsert, newCheckInCode } from './club-setup.rules'

describe('club-setup rules', () => {
  it('generates a valid 6-char readable check-in code', () => {
    const code = newCheckInCode()
    expect(code).toHaveLength(6)
    expect(code).toMatch(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/)
  })

  it('maps stamps draft to program row correctly', () => {
    const draft: ClubSetupDraft['program'] = {
      reward: { title: 'Corte grátis' },
      rules: { mode: 'stamps', target: 10 },
      bonusRules: {
        welcomeBonus: { enabled: true, units: 2 },
        birthdayMultiplier: { enabled: false, multiplier: 2 },
        referralBonus: { enabled: false, units: 1 },
        surpriseDay: { enabled: false, multiplier: 2, date: null },
      },
      expirationPolicy: { kind: 'never' },
      checkIn: { enabled: true, cooldownHours: 4, cooldownMode: 'rolling' },
    }

    const row = mapDraftToProgramInsert('shop-123', draft)
    expect(row).toEqual({
      shopId: 'shop-123',
      active: true,
      rewardTitle: 'Corte grátis',
      mode: 'stamps',
      unit: 'stamp',
      earnPer: 'visit',
      earnUnits: 1,
      target: 10,
      bonusRules: draft.bonusRules,
      expirationKind: 'never',
      expirationMonths: null,
      checkInEnabled: true,
      checkInCooldownHours: 4,
      checkInCooldownMode: 'rolling',
    })
  })

  it('maps pointsPerCurrency draft to program row correctly', () => {
    const draft: ClubSetupDraft['program'] = {
      reward: { title: 'Café grátis' },
      rules: { mode: 'pointsPerCurrency', pointsPerReal: 2, target: 100 },
      bonusRules: {
        welcomeBonus: { enabled: false, units: 1 },
        birthdayMultiplier: { enabled: true, multiplier: 2 },
        referralBonus: { enabled: false, units: 1 },
        surpriseDay: { enabled: false, multiplier: 2, date: null },
      },
      expirationPolicy: { kind: 'afterInactivity', months: 6 },
      checkIn: { enabled: true, cooldownHours: 2, cooldownMode: 'rolling' },
    }

    const row = mapDraftToProgramInsert('shop-456', draft)
    expect(row.mode).toBe('pointsPerCurrency')
    expect(row.unit).toBe('point')
    expect(row.earnPer).toBe('real')
    expect(row.earnUnits).toBe(2)
    expect(row.expirationMonths).toBe(6)
  })
})
