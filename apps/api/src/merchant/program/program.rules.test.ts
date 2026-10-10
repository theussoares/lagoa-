import { describe, expect, it } from 'vitest'
import type { ProgramDraft } from '#shared/schemas/program'
import { toProgram } from '../../programs/program-rules.mapper'
import { mapDraftToProgramInsert } from './program.rules'

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

  // Linha gravada e lida de volta tem que dar o mesmo programa: senão o que o lojista salvou não é o que o cliente vê.
  it.each<[string, ProgramDraft]>([
    [
      'stamps',
      {
        reward: { title: 'Café' },
        rules: { mode: 'stamps', target: 10 },
        bonusRules: {
          welcomeBonus: { enabled: true, units: 2 },
          birthdayMultiplier: { enabled: true, multiplier: 2 },
          referralBonus: { enabled: false, units: 1 },
          surpriseDay: { enabled: true, multiplier: 2, date: '2026-12-25' },
        },
        expirationPolicy: { kind: 'afterInactivity', months: 12 },
        checkIn: { enabled: true, cooldownHours: 4 },
      },
    ],
    [
      'pointsPerVisit',
      {
        reward: { title: 'Desconto' },
        rules: { mode: 'pointsPerVisit', pointsPerVisit: 5, target: 100 },
        bonusRules: {
          welcomeBonus: { enabled: false, units: 1 },
          birthdayMultiplier: { enabled: false, multiplier: 2 },
          referralBonus: { enabled: false, units: 1 },
          surpriseDay: { enabled: false, multiplier: 2, date: null },
        },
        expirationPolicy: { kind: 'never' },
        checkIn: { enabled: false, cooldownHours: 24 },
      },
    ],
    [
      'pointsPerCurrency',
      {
        reward: { title: 'Brinde' },
        rules: { mode: 'pointsPerCurrency', pointsPerReal: 3, target: 300 },
        bonusRules: {
          welcomeBonus: { enabled: false, units: 1 },
          birthdayMultiplier: { enabled: false, multiplier: 2 },
          referralBonus: { enabled: false, units: 1 },
          surpriseDay: { enabled: false, multiplier: 2, date: null },
        },
        expirationPolicy: { kind: 'never' },
        checkIn: { enabled: true, cooldownHours: 24 },
      },
    ],
  ])('reads back the same program for %s', (_mode, draft) => {
    const row = mapDraftToProgramInsert('018f98a2-7b2a-7182-9f33-6d004bbbb222', draft)

    const read = toProgram({ ...row, id: '018f98a2-7b2a-7182-9f33-6d004bbbb111' })

    expect(read).toEqual({
      ok: true,
      value: {
        id: '018f98a2-7b2a-7182-9f33-6d004bbbb111',
        shopId: '018f98a2-7b2a-7182-9f33-6d004bbbb222',
        reward: draft.reward,
        rules: draft.rules,
        bonusRules: draft.bonusRules,
        expirationPolicy: draft.expirationPolicy,
        checkIn: draft.checkIn,
      },
    })
  })
})
