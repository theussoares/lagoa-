import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { UInputNumber, USelect } from '#components'
import { useNuxtApp } from '#imports'
import { mountComponent, unmountAll } from '#layers/core/test/componentHarness.nuxt'
import { REWARD_TITLE_MAX_LENGTH } from '#shared/constants/domain'
import type { BonusRules, ProgramRules } from '#shared/schemas/program'
import BonusFields from '../app/components/program/BonusFields.vue'
import EarnFields from '../app/components/program/EarnFields.vue'
import PreviewAside from '../app/components/program/PreviewAside.vue'
import RewardTitleField from '../app/components/program/RewardTitleField.vue'
import VisitRulesFields from '../app/components/program/VisitRulesFields.vue'
import { emptyClubSetupForm } from '../app/utils/clubSetupForm'
import { toProgramPreview } from '../app/utils/programPreviewModel'
import type { ProgramFieldLimits } from '../app/types/program'

function t(key: string, named?: Record<string, unknown>): string {
  return useNuxtApp().$i18n.t(key, named ?? {})
}

const mountIt = mountComponent

afterEach(unmountAll)

const limits: ProgramFieldLimits = {
  target: { min: 3, max: 20 },
  rate: { min: 1, max: 100 },
  welcomeUnits: { min: 1, max: 5 },
  referralUnits: { min: 1, max: 5 },
}

const stampRules: ProgramRules = { mode: 'stamps', target: 10 }

function bonus(overrides: Partial<BonusRules> = {}): BonusRules {
  return { ...emptyClubSetupForm().program.bonusRules, ...overrides }
}

function switchByLabel(page: VueWrapper, label: string): ReturnType<VueWrapper['get']> {
  const found = page.findAll('button[role="switch"]').find((item) => item.attributes('id') && page.get(`label[for="${item.attributes('id')}"]`).text().includes(label))
  if (!found) throw new Error(`switch "${label}" missing`)
  return found
}

describe('program components: PreviewAside', () => {
  const preview = toProgramPreview(emptyClubSetupForm().program, 'Lava-jato Brilho', (key) => key)

  it('is a labelled landmark with the title and the earn line', async () => {
    const page = await mountIt(PreviewAside, { preview, label: 'Prévia do cartão', title: 'Assim o cliente vê', headingLevel: 'h2' })
    expect(page.get('aside').attributes('aria-label')).toBe('Prévia do cartão')
    expect(page.text()).toContain('Assim o cliente vê')
    expect(page.text()).toContain(preview.earnLine)
  })

  it('renders the card heading at the requested level', async () => {
    const h3 = await mountIt(PreviewAside, { preview, label: 'Prévia', title: 'Título', headingLevel: 'h3' })
    expect(h3.find('aside h3').exists()).toBe(true)
    expect(h3.find('aside h2').exists()).toBe(false)
  })
})

describe('program components: RewardTitleField', () => {
  it('has a labelled field limited to the maximum length', async () => {
    const page = await mountIt(RewardTitleField, { title: 'Corte grátis', invalid: false })
    const input = page.get('input')
    expect(page.get('label').text()).toBe(t('program.reward.label'))
    expect(input.attributes('maxlength')).toBe(String(REWARD_TITLE_MAX_LENGTH))
    expect((input.element as HTMLInputElement).value).toBe('Corte grátis')
    expect(page.text()).not.toContain(t('program.errors.rewardTitle', { max: REWARD_TITLE_MAX_LENGTH }))
  })

  it('shows the error and marks the field invalid', async () => {
    const page = await mountIt(RewardTitleField, { title: '', invalid: true })
    expect(page.text()).toContain(t('program.errors.rewardTitle', { max: REWARD_TITLE_MAX_LENGTH }))
    expect(page.get('input').attributes('aria-invalid')).toBe('true')
  })

  it('emits the typed title', async () => {
    const page = await mountIt(RewardTitleField, { title: '', invalid: false })
    await page.get('input').setValue('Café grátis')
    expect(page.emitted('update:title')?.at(-1)).toEqual(['Café grátis'])
  })
})

describe('program components: EarnFields', () => {
  const earnProps = { unit: 'stamp', limits, errors: {}, targetChanged: false, rules: stampRules }

  it('offers the three modes as radios and emits the picked one', async () => {
    const page = await mountIt(EarnFields, earnProps)
    const radios = page.findAll('[role="radio"]')
    expect(radios).toHaveLength(3)
    expect(radios[0]?.attributes('aria-checked')).toBe('true')
    await radios[2]?.trigger('click')
    expect(page.emitted('mode')?.[0]).toEqual(['pointsPerVisit'])
  })

  it('names the target field after the unit and shows the range error', async () => {
    const page = await mountIt(EarnFields, { ...earnProps, unit: 'point', errors: { target: true }, rules: { mode: 'pointsPerVisit', pointsPerVisit: 10, target: 100 } })
    expect(page.text()).toContain(t('program.earn.target.point'))
    expect(page.text()).toContain(t('program.errors.range', { ...limits.target }))
  })

  it('asks for the rate that matches the mode, and none for stamps', async () => {
    const stamps = await mountIt(EarnFields, earnProps)
    expect(stamps.find('input[name="pointsPerReal"]').exists()).toBe(false)
    expect(stamps.find('input[name="pointsPerVisit"]').exists()).toBe(false)
    stamps.unmount()
    const perReal = await mountIt(EarnFields, { ...earnProps, unit: 'point', rules: { mode: 'pointsPerCurrency', pointsPerReal: 2, target: 150 } })
    expect(perReal.text()).toContain(t('program.earn.pointsPerReal'))
    perReal.unmount()
    const perVisit = await mountIt(EarnFields, { ...earnProps, unit: 'point', rules: { mode: 'pointsPerVisit', pointsPerVisit: 10, target: 100 } })
    expect(perVisit.text()).toContain(t('program.earn.pointsPerVisit'))
  })

  it('writes a changed target back keeping the other rules, and treats an empty one as zero', async () => {
    const page = await mountIt(EarnFields, earnProps)
    const target = page.findAllComponents(UInputNumber)[0]
    if (!target) throw new Error('target field missing')
    target.vm.$emit('update:modelValue', 12)
    await flushPromises()
    expect(page.emitted('update:rules')?.at(-1)).toEqual([{ mode: 'stamps', target: 12 }])
    target.vm.$emit('update:modelValue', null)
    await flushPromises()
    expect(page.emitted('update:rules')?.at(-1)).toEqual([{ mode: 'stamps', target: 0 }])
  })

  it('writes the rate of the current mode back', async () => {
    const page = await mountIt(EarnFields, { ...earnProps, unit: 'point', rules: { mode: 'pointsPerCurrency', pointsPerReal: 1, target: 150 } })
    const rate = page.findAllComponents(UInputNumber)[1]
    if (!rate) throw new Error('rate field missing')
    rate.vm.$emit('update:modelValue', 3)
    await flushPromises()
    expect(page.emitted('update:rules')?.at(-1)).toEqual([{ mode: 'pointsPerCurrency', pointsPerReal: 3, target: 150 }])
  })

  it('warns that a changed target also counts for cards in progress, and only then', async () => {
    const quiet = await mountIt(EarnFields, earnProps)
    expect(quiet.text()).not.toContain(t('program.earn.targetChangeNote'))
    quiet.unmount()
    const warned = await mountIt(EarnFields, { ...earnProps, targetChanged: true })
    expect(warned.text()).toContain(t('program.earn.targetChangeNote'))
  })
})

describe('program components: VisitRulesFields', () => {
  const visitProps = {
    checkIn: { enabled: true, cooldownHours: 4 },
    expiration: { kind: 'never' },
    cooldownOptions: [
      { label: '4 horas', value: '4' },
      { label: '1 dia', value: '24' },
    ],
    expirationOptions: [
      { label: 'Nunca', value: 'never' },
      { label: '6 meses', value: '6' },
    ],
    errors: {},
  }

  it('has a check-in switch that keeps the cooldown when toggled', async () => {
    const page = await mountIt(VisitRulesFields, visitProps)
    const toggle = switchByLabel(page, t('program.visitRules.checkIn.label'))
    expect(toggle.attributes('aria-checked')).toBe('true')
    await toggle.trigger('click')
    expect(page.emitted('update:checkIn')?.at(-1)).toEqual([{ enabled: false, cooldownHours: 4 }])
  })

  it('writes a valid cooldown back and ignores values that are not positive whole hours', async () => {
    const page = await mountIt(VisitRulesFields, visitProps)
    const [cooldown] = page.findAllComponents(USelect)
    if (!cooldown) throw new Error('cooldown select missing')
    cooldown.vm.$emit('update:modelValue', '24')
    await flushPromises()
    expect(page.emitted('update:checkIn')?.at(-1)).toEqual([{ enabled: true, cooldownHours: 24 }])
    const count = page.emitted('update:checkIn')?.length
    for (const invalid of ['0', '-3', '1.5', 'abc']) cooldown.vm.$emit('update:modelValue', invalid)
    await flushPromises()
    expect(page.emitted('update:checkIn')?.length).toBe(count)
  })

  it('maps the expiration choice to a policy: never, or after months of inactivity', async () => {
    const page = await mountIt(VisitRulesFields, { ...visitProps, expiration: { kind: 'afterInactivity', months: 6 } })
    const expiration = page.findAllComponents(USelect)[1]
    if (!expiration) throw new Error('expiration select missing')
    expiration.vm.$emit('update:modelValue', 'never')
    await flushPromises()
    expect(page.emitted('update:expiration')?.at(-1)).toEqual([{ kind: 'never' }])
    expiration.vm.$emit('update:modelValue', '12')
    await flushPromises()
    expect(page.emitted('update:expiration')?.at(-1)).toEqual([{ kind: 'afterInactivity', months: 12 }])
  })

  it('shows the option errors', async () => {
    const page = await mountIt(VisitRulesFields, { ...visitProps, errors: { cooldownHours: true, expirationMonths: true } })
    expect(page.text().split(t('program.errors.option'))).toHaveLength(3)
  })
})

describe('program components: BonusFields', () => {
  const bonusProps = { unit: 'stamp', limits, errors: {}, bonus: bonus() }

  it('has one switch per bonus rule, reflecting which are on', async () => {
    const page = await mountIt(BonusFields, bonusProps)
    const states = page.findAll('button[role="switch"]').map((item) => item.attributes('aria-checked'))
    expect(states).toEqual(['true', 'true', 'false', 'false'])
  })

  it('toggles a rule without touching the others', async () => {
    const page = await mountIt(BonusFields, bonusProps)
    await switchByLabel(page, t('program.bonus.referral.label')).trigger('click')
    const next = page.emitted('update:bonus')?.at(-1)?.[0]
    expect(next).toEqual(bonus({ referralBonus: { enabled: true, units: 1 } }))
  })

  it('asks for the units only while the rule is on, naming them by unit, and shows their range error', async () => {
    const off = await mountIt(BonusFields, { ...bonusProps, bonus: bonus({ welcomeBonus: { enabled: false, units: 2 } }) })
    expect(off.find('input[name="welcomeUnits"]').exists()).toBe(false)
    off.unmount()
    const on = await mountIt(BonusFields, { ...bonusProps, unit: 'point', errors: { welcomeUnits: true } })
    expect(on.text()).toContain(t('program.bonus.unitsLabel.point'))
    expect(on.text()).toContain(t('program.errors.welcomeUnits', { ...limits.welcomeUnits }))
  })

  it('writes the welcome units back, treating an empty field as zero', async () => {
    const page = await mountIt(BonusFields, bonusProps)
    const [welcome] = page.findAllComponents(UInputNumber)
    if (!welcome) throw new Error('welcome units field missing')
    welcome.vm.$emit('update:modelValue', 4)
    await flushPromises()
    expect(page.emitted('update:bonus')?.at(-1)?.[0]).toEqual(bonus({ welcomeBonus: { enabled: true, units: 4 } }))
    welcome.vm.$emit('update:modelValue', null)
    await flushPromises()
    expect(page.emitted('update:bonus')?.at(-1)?.[0]).toEqual(bonus({ welcomeBonus: { enabled: true, units: 0 } }))
  })

  it('takes the surprise day date as an ISO date and drops anything else', async () => {
    const page = await mountIt(BonusFields, { ...bonusProps, bonus: bonus({ surpriseDay: { enabled: true, multiplier: 2, date: null } }) })
    const date = page.get('input[type="date"]')
    await date.setValue('2026-12-24')
    expect(page.emitted('update:bonus')?.at(-1)?.[0]).toEqual(bonus({ surpriseDay: { enabled: true, multiplier: 2, date: '2026-12-24' } }))
    await date.setValue('')
    expect(page.emitted('update:bonus')?.at(-1)?.[0]).toEqual(bonus({ surpriseDay: { enabled: true, multiplier: 2, date: null } }))
  })

  it('explains that multipliers do not stack', async () => {
    const page = await mountIt(BonusFields, bonusProps)
    expect(page.text()).toContain(t('program.bonus.noStacking'))
  })
})
