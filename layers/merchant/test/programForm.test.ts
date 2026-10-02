import { describe, expect, it } from 'vitest'
import { STAMPS_TARGET_MAX } from '#shared/constants/domain'
import { ProgramDraftSchema } from '#shared/schemas/program'
import type { ProgramDraft } from '#shared/schemas/program'
import type { Translate } from '#layers/core/app/utils/translate'
import { isSameDraft, programFieldErrors, switchMode } from '../app/utils/programForm'
import { toProgramPreview } from '../app/utils/programPreviewModel'

const t: Translate = (key, named = {}, plural) =>
  [key, ...Object.entries(named).map(([name, value]) => `${name}=${String(value)}`), plural === undefined ? '' : `#${plural}`]
    .filter(Boolean)
    .join(' ')

function draft(overrides: Partial<ProgramDraft> = {}): ProgramDraft {
  return ProgramDraftSchema.parse({
    reward: { title: 'Corte grátis' },
    rules: { mode: 'stamps', target: 10 },
    bonusRules: {
      welcomeBonus: { enabled: true, units: 2 },
      birthdayMultiplier: { enabled: true, multiplier: 2 },
      referralBonus: { enabled: false, units: 1 },
      surpriseDay: { enabled: false, multiplier: 2, date: null },
    },
    expirationPolicy: { kind: 'afterInactivity', months: 6 },
    checkIn: { enabled: true, cooldownHours: 4 },
    ...overrides,
  })
}

describe('switchMode', () => {
  it('keeps the target and fills the rate when moving to points', () => {
    expect(switchMode({ mode: 'stamps', target: 10 }, 'pointsPerVisit')).toEqual({ mode: 'pointsPerVisit', pointsPerVisit: 10, target: 10 })
    expect(switchMode({ mode: 'stamps', target: 10 }, 'pointsPerCurrency')).toEqual({ mode: 'pointsPerCurrency', pointsPerReal: 1, target: 10 })
  })

  it('clamps a points target that does not fit on a stamp card', () => {
    expect(switchMode({ mode: 'pointsPerCurrency', pointsPerReal: 1, target: 150 }, 'stamps')).toEqual({ mode: 'stamps', target: STAMPS_TARGET_MAX })
  })
})

describe('programFieldErrors', () => {
  it('is empty for a valid draft', () => {
    expect(programFieldErrors(draft())).toEqual({})
  })

  it('maps schema issues to the fields on screen', () => {
    const invalid = { ...draft(), reward: { title: ' ' }, rules: { mode: 'stamps' as const, target: 25 } }
    expect(programFieldErrors(invalid)).toEqual({ rewardTitle: true, target: true })
  })

  it('asks for a date when the surprise day is on', () => {
    const base = draft()
    const surprise = { ...base, bonusRules: { ...base.bonusRules, surpriseDay: { enabled: true, multiplier: 2 as const, date: null } } }
    expect(programFieldErrors(surprise)).toEqual({ surpriseDate: true })
  })
})

describe('isSameDraft', () => {
  it('ignores key order inside the rules', () => {
    const a = draft({ rules: { mode: 'pointsPerVisit', pointsPerVisit: 10, target: 100 } })
    const b = { ...a, rules: { target: 100, mode: 'pointsPerVisit' as const, pointsPerVisit: 10 } }
    expect(isSameDraft(a, b)).toBe(true)
    expect(isSameDraft(a, { ...a, reward: { title: 'Outro' } })).toBe(false)
  })
})

describe('toProgramPreview', () => {
  it('shows a new card already holding the welcome stamps', () => {
    const { card, earnLine } = toProgramPreview(draft(), 'Barbearia Navalha', t)
    expect(card.progress).toBe('02/10')
    expect(card.body.kind).toBe('slots')
    if (card.body.kind === 'slots') expect(card.body.slots.filter((slot) => slot.stamped)).toHaveLength(2)
    expect(earnLine).toBe('program.preview.earn.visit units=units.stamp #1')
  })

  it('starts empty without the welcome bonus and draws points as a ruler', () => {
    const base = draft()
    const points = { ...base, rules: { mode: 'pointsPerCurrency' as const, pointsPerReal: 2, target: 150 }, bonusRules: { ...base.bonusRules, welcomeBonus: { enabled: false, units: 2 } } }
    const { card, earnLine } = toProgramPreview(points, 'Café', t)
    expect(card.progress).toBe('000/150')
    expect(card.body.kind).toBe('ruler')
    expect(earnLine).toBe('program.preview.earn.real units=units.point #2')
  })

  it('uses a placeholder while the reward is blank', () => {
    const { card } = toProgramPreview({ ...draft(), reward: { title: '' } }, 'Barbearia', t)
    expect(card.status.kind === 'remaining' && card.status.reward).toBe('program.preview.rewardPlaceholder')
  })
})
