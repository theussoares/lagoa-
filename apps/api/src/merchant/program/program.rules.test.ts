import { describe, expect, it } from 'vitest'
import type { Program, ProgramDraft } from '#shared/schemas/program'
import { canChangeProgramMode, hasCriticalChanges, mapDraftToProgramInsert } from './program.rules'

describe('canChangeProgramMode', () => {
  it('allows keeping the same mode even with active cards', () => {
    expect(canChangeProgramMode(0, 'stamps', 'stamps')).toBe(true)
    expect(canChangeProgramMode(5, 'stamps', 'stamps')).toBe(true)
    expect(canChangeProgramMode(100, 'pointsPerCurrency', 'pointsPerCurrency')).toBe(true)
  })

  it('allows changing mode when there are 0 active cards', () => {
    expect(canChangeProgramMode(0, 'stamps', 'pointsPerVisit')).toBe(true)
    expect(canChangeProgramMode(0, 'pointsPerVisit', 'pointsPerCurrency')).toBe(true)
  })

  it('locks and refuses changing mode when there are active cards', () => {
    expect(canChangeProgramMode(1, 'stamps', 'pointsPerVisit')).toBe(false)
    expect(canChangeProgramMode(10, 'stamps', 'pointsPerCurrency')).toBe(false)
    expect(canChangeProgramMode(5, 'pointsPerVisit', 'stamps')).toBe(false)
  })
})

describe('hasCriticalChanges', () => {
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

  it('returns false when draft is identical', () => {
    expect(hasCriticalChanges(baseProgram, baseDraft)).toBe(false)
  })

  it('returns false when only reward title changed', () => {
    expect(
      hasCriticalChanges(baseProgram, {
        ...baseDraft,
        reward: { title: 'Café especial com bolo' },
      }),
    ).toBe(false)
  })

  it('returns true when mode changed', () => {
    expect(
      hasCriticalChanges(baseProgram, {
        ...baseDraft,
        rules: { mode: 'pointsPerVisit', pointsPerVisit: 10, target: 100 },
      }),
    ).toBe(true)
  })

  it('returns true when target changed', () => {
    expect(
      hasCriticalChanges(baseProgram, {
        ...baseDraft,
        rules: { mode: 'stamps', target: 12 },
      }),
    ).toBe(true)
  })

  it('returns true when earn rate changed for pointsPerVisit', () => {
    const pointsProgram: Program = {
      ...baseProgram,
      rules: { mode: 'pointsPerVisit', pointsPerVisit: 10, target: 100 },
    }
    const pointsDraft: ProgramDraft = {
      ...baseDraft,
      rules: { mode: 'pointsPerVisit', pointsPerVisit: 20, target: 100 },
    }
    expect(hasCriticalChanges(pointsProgram, pointsDraft)).toBe(true)
  })

  it('returns true when earn rate changed for pointsPerCurrency', () => {
    const pointsProgram: Program = {
      ...baseProgram,
      rules: { mode: 'pointsPerCurrency', pointsPerReal: 2, target: 100 },
    }
    const pointsDraft: ProgramDraft = {
      ...baseDraft,
      rules: { mode: 'pointsPerCurrency', pointsPerReal: 3, target: 100 },
    }
    expect(hasCriticalChanges(pointsProgram, pointsDraft)).toBe(true)
  })

  it('returns true when bonus rules changed', () => {
    expect(
      hasCriticalChanges(baseProgram, {
        ...baseDraft,
        bonusRules: {
          ...baseDraft.bonusRules,
          welcomeBonus: { enabled: true, units: 2 },
        },
      }),
    ).toBe(true)
  })

  it('returns true when expiration policy changed', () => {
    expect(
      hasCriticalChanges(baseProgram, {
        ...baseDraft,
        expirationPolicy: { kind: 'afterInactivity', months: 6 },
      }),
    ).toBe(true)
  })

  it('returns true when check-in cooldown changed', () => {
    expect(
      hasCriticalChanges(baseProgram, {
        ...baseDraft,
        checkIn: { enabled: true, cooldownHours: 48 },
      }),
    ).toBe(true)
  })
})

describe('mapDraftToProgramInsert', () => {
  it('maps stamps draft to insert object', () => {
    const draft: ProgramDraft = {
      reward: { title: 'Bolo de cenoura' },
      rules: { mode: 'stamps', target: 8 },
      bonusRules: {
        welcomeBonus: { enabled: true, units: 1 },
        birthdayMultiplier: { enabled: false, multiplier: 2 },
        referralBonus: { enabled: true, units: 1 },
        surpriseDay: { enabled: false, multiplier: 2, date: null },
      },
      expirationPolicy: { kind: 'never' },
      checkIn: { enabled: true, cooldownHours: 12 },
    }

    const inserted = mapDraftToProgramInsert('shop-uuid-1', draft)

    expect(inserted).toEqual({
      shopId: 'shop-uuid-1',
      active: true,
      rewardTitle: 'Bolo de cenoura',
      mode: 'stamps',
      unit: 'stamp',
      earnPer: 'visit',
      earnUnits: 1,
      target: 8,
      bonusRules: draft.bonusRules,
      expirationKind: 'never',
      expirationMonths: null,
      checkInEnabled: true,
      checkInCooldownHours: 12,
    })
  })

  it('maps pointsPerCurrency draft with expiration months', () => {
    const draft: ProgramDraft = {
      reward: { title: 'Desconto de R$ 20' },
      rules: { mode: 'pointsPerCurrency', pointsPerReal: 2, target: 200 },
      bonusRules: {
        welcomeBonus: { enabled: false, units: 1 },
        birthdayMultiplier: { enabled: false, multiplier: 2 },
        referralBonus: { enabled: false, units: 1 },
        surpriseDay: { enabled: false, multiplier: 2, date: null },
      },
      expirationPolicy: { kind: 'afterInactivity', months: 6 },
      checkIn: { enabled: false, cooldownHours: 24 },
    }

    const inserted = mapDraftToProgramInsert('shop-uuid-2', draft)

    expect(inserted).toEqual({
      shopId: 'shop-uuid-2',
      active: true,
      rewardTitle: 'Desconto de R$ 20',
      mode: 'pointsPerCurrency',
      unit: 'point',
      earnPer: 'real',
      earnUnits: 2,
      target: 200,
      bonusRules: draft.bonusRules,
      expirationKind: 'afterInactivity',
      expirationMonths: 6,
      checkInEnabled: false,
      checkInCooldownHours: 24,
    })
  })
})
