import { describe, expect, it } from 'vitest'
import { ProgramDraftSchema } from '#shared/schemas/program'
import type { ProgramDraft } from '#shared/schemas/program'
import type { Translate } from '#layers/core/app/types/i18n'
import { cooldownLabel, sectionHasError, toProgramSummaries } from '../app/utils/programSummary'

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
    checkIn: { enabled: true, cooldownHours: 24 },
    ...overrides,
  })
}

describe('cooldownLabel', () => {
  it('counts whole days in days and the rest in hours', () => {
    expect(cooldownLabel(48, t)).toBe('program.visitRules.cooldownDays count=2 #2')
    expect(cooldownLabel(4, t)).toBe('program.visitRules.cooldownHours count=4 #4')
  })
})

describe('toProgramSummaries', () => {
  it('lists only the bonus rules that are on', () => {
    expect(toProgramSummaries(draft(), t).bonus).toBe(
      'program.summary.welcome units=units.stamp count=2 #2 · program.bonus.birthday.label',
    )
  })

  it('says when no bonus rule is on', () => {
    const off = { enabled: false }
    const summary = toProgramSummaries(
      draft({
        bonusRules: {
          welcomeBonus: { ...off, units: 2 },
          birthdayMultiplier: { ...off, multiplier: 2 },
          referralBonus: { ...off, units: 1 },
          surpriseDay: { ...off, multiplier: 2, date: null },
        },
      }),
      t,
    )
    expect(summary.bonus).toBe('program.summary.noBonus')
  })

  it('reads check-in, the anti-fraud window and expiration in one line', () => {
    expect(toProgramSummaries(draft({ expirationPolicy: { kind: 'never' } }), t).visitRules).toBe(
      'program.summary.checkInOn · program.summary.cooldown interval=program.visitRules.cooldownDays count=1 #1 · program.summary.neverExpires',
    )
  })
})

describe('expiration in the summary', () => {
  it('counts the months without a visit', () => {
    expect(toProgramSummaries(draft(), t).visitRules).toContain('program.summary.expiresAfter count=6 #6')
  })
})

describe('sectionHasError', () => {
  it('opens only the section that holds the wrong field', () => {
    expect(sectionHasError('bonus', { surpriseDate: true })).toBe(true)
    expect(sectionHasError('visitRules', { surpriseDate: true })).toBe(false)
    expect(sectionHasError('visitRules', { expirationMonths: true })).toBe(true)
  })
})
