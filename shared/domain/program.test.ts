import { describe, expect, it } from 'vitest'
import type { Program, ProgramDraft } from '../schemas/program'
import { isSameProgram } from './program'

describe('isSameProgram', () => {
  const baseProgram: Program = {
    id: '018f98a2-7b2a-7182-9f33-6d004bbbb111' as any,
    shopId: '018f98a2-7b2a-7182-9f33-6d004bbbb222' as any,
    reward: { title: 'Café grátis' },
    rules: { mode: 'stamps', target: 10 },
    bonusRules: {
      welcomeBonus: { enabled: true, units: 1 },
      birthdayMultiplier: { enabled: false, multiplier: 2 },
      referralBonus: { enabled: true, units: 1 },
      surpriseDay: { enabled: false, multiplier: 2, date: null },
    },
    expirationPolicy: { kind: 'never' },
    checkIn: { enabled: true, cooldownHours: 24 },
  }

  const baseDraft: ProgramDraft = {
    reward: { title: 'Café grátis' },
    rules: { mode: 'stamps', target: 10 },
    bonusRules: {
      welcomeBonus: { enabled: true, units: 1 },
      birthdayMultiplier: { enabled: false, multiplier: 2 },
      referralBonus: { enabled: true, units: 1 },
      surpriseDay: { enabled: false, multiplier: 2, date: null },
    },
    expirationPolicy: { kind: 'never' },
    checkIn: { enabled: true, cooldownHours: 24 },
  }

  it('is the same when the draft is identical', () => {
    expect(isSameProgram(baseProgram, baseDraft)).toBe(true)
  })

  it('is the same when only the reward title changed', () => {
    expect(isSameProgram(baseProgram, { ...baseDraft, reward: { title: 'Café especial com bolo' } })).toBe(true)
  })

  it('is not the same when the mode changed', () => {
    expect(
      isSameProgram(baseProgram, {
        ...baseDraft,
        rules: { mode: 'pointsPerVisit', pointsPerVisit: 10, target: 100 },
      }),
    ).toBe(false)
  })

  it('is not the same when the target changed', () => {
    expect(isSameProgram(baseProgram, { ...baseDraft, rules: { mode: 'stamps', target: 12 } })).toBe(false)
  })

  it('is not the same when the earn rate changed for pointsPerVisit', () => {
    const pointsProgram: Program = { ...baseProgram, rules: { mode: 'pointsPerVisit', pointsPerVisit: 10, target: 100 } }
    const pointsDraft: ProgramDraft = { ...baseDraft, rules: { mode: 'pointsPerVisit', pointsPerVisit: 20, target: 100 } }
    expect(isSameProgram(pointsProgram, pointsDraft)).toBe(false)
  })

  it('is not the same when the earn rate changed for pointsPerCurrency', () => {
    const pointsProgram: Program = { ...baseProgram, rules: { mode: 'pointsPerCurrency', pointsPerReal: 2, target: 100 } }
    const pointsDraft: ProgramDraft = { ...baseDraft, rules: { mode: 'pointsPerCurrency', pointsPerReal: 3, target: 100 } }
    expect(isSameProgram(pointsProgram, pointsDraft)).toBe(false)
  })

  it('is not the same when bonus rules changed', () => {
    expect(
      isSameProgram(baseProgram, {
        ...baseDraft,
        bonusRules: { ...baseDraft.bonusRules, welcomeBonus: { enabled: true, units: 2 } },
      }),
    ).toBe(false)
  })

  it('is not the same when the expiration policy changed', () => {
    expect(isSameProgram(baseProgram, { ...baseDraft, expirationPolicy: { kind: 'afterInactivity', months: 6 } })).toBe(false)
  })

  it('is not the same when the check-in cooldown changed', () => {
    expect(isSameProgram(baseProgram, { ...baseDraft, checkIn: { enabled: true, cooldownHours: 48 } })).toBe(false)
  })
})
