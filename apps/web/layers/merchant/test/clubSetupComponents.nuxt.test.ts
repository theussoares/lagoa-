import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { useNuxtApp } from '#imports'
import { mountComponent, unmountAll } from '#layers/core/test/componentHarness.nuxt'
import { REWARD_TITLE_MAX_LENGTH, SHOP_ADDRESS_MAX_LENGTH, SHOP_NAME_MAX_LENGTH } from '#shared/constants/domain'
import Header from '../app/components/club-setup/Header.vue'
import FormStep from '../app/components/club-setup/FormStep.vue'
import Poster from '../app/components/club-setup/Poster.vue'
import PosterStep from '../app/components/club-setup/PosterStep.vue'
import RewardStep from '../app/components/club-setup/RewardStep.vue'
import RulesStep from '../app/components/club-setup/RulesStep.vue'
import ShopFields from '../app/components/club-setup/ShopFields.vue'
import ShopStep from '../app/components/club-setup/ShopStep.vue'
import Steps from '../app/components/club-setup/Steps.vue'
import type { CheckInPosterModel } from '../app/types/poster'
import type { ProgramFieldOptions } from '../app/types/program'
import type { SetupStepItem } from '../app/types/clubSetup'
import { emptyClubSetupForm } from '../app/utils/clubSetupForm'

function t(key: string, named?: Record<string, unknown>): string {
  return useNuxtApp().$i18n.t(key, named ?? {})
}

const mountIt = mountComponent

afterEach(unmountAll)

function button(page: VueWrapper, label: string): ReturnType<VueWrapper['get']> {
  const found = page.findAll('a, button').find((item) => item.text() === label)
  if (!found) throw new Error(`"${label}" missing`)
  return found
}

const items: SetupStepItem[] = [
  { key: 'shop', state: 'done' },
  { key: 'rules', state: 'current' },
  { key: 'reward', state: 'next' },
  { key: 'poster', state: 'next' },
]

const options: ProgramFieldOptions = {
  unit: 'stamp',
  limits: {
    target: { min: 3, max: 20 },
    rate: { min: 1, max: 100 },
    welcomeUnits: { min: 1, max: 5 },
    referralUnits: { min: 1, max: 5 },
  },
  cooldownOptions: [{ label: '4 horas', value: '4' }],
  expirationOptions: [{ label: 'Nunca', value: 'never' }],
  summaries: null,
}

const poster: CheckInPosterModel = {
  brand: 'Lagoa+',
  shopName: 'Lava-jato Brilho',
  headline: 'Junte 10 carimbos e ganhe Lavagem grátis',
  instruction: 'Escaneie para ganhar seu carimbo.',
  codeLabel: 'Sem câmera? Digite o código',
  code: 'ABC123',
  qr: { size: 21, d: 'M0 0h1v1h-1z' },
  qrLabel: 'QR code do check-in',
}

describe('club setup components: Steps and Header', () => {
  it('lists the steps in order, marking only the current one and saying which are done', async () => {
    const page = await mountIt(Steps, { steps: items })
    const rows = page.findAll('li')
    expect(page.get('ol').attributes('aria-label')).toBe(t('clubSetup.stepsLabel'))
    expect(rows).toHaveLength(4)
    expect(rows.map((row) => row.attributes('aria-current'))).toEqual([undefined, 'step', undefined, undefined])
    expect(rows[0]?.text()).toContain(t('clubSetup.stepDone'))
    expect(rows[1]?.text()).not.toContain(t('clubSetup.stepDone'))
    expect(rows[1]?.text()).toContain(t('clubSetup.steps.rules'))
  })

  it('keeps the step height at 36px or more', async () => {
    const page = await mountIt(Steps, { steps: items })
    expect(page.findAll('li').every((row) => row.classes().includes('h-9'))).toBe(true)
  })

  it('names the shop in the header once it has a name, and a generic line before', async () => {
    const named = await mountIt(Header, { shopName: 'Lava-jato Brilho', steps: items })
    expect(named.text()).toContain(t('clubSetup.creatingFor', { shop: 'Lava-jato Brilho' }))
    named.unmount()
    const anonymous = await mountIt(Header, { shopName: '', steps: items })
    expect(anonymous.text()).toContain(t('clubSetup.creating'))
    expect(anonymous.text()).not.toContain('Lava-jato Brilho')
  })
})

describe('club setup components: FormStep', () => {
  const formProps = { step: 'rules', creating: false, submitError: null }

  it('titles the form with the step heading, which can take the focus', async () => {
    const page = await mountIt(FormStep, formProps)
    const heading = page.get('h1')
    expect(heading.text()).toBe(t('clubSetup.rules.title'))
    expect(heading.attributes('tabindex')).toBe('-1')
    expect(page.text()).toContain(t('clubSetup.rules.lead'))
  })

  it('has no back button on the first step and a continue label per step', async () => {
    const first = await mountIt(FormStep, { ...formProps, step: 'shop' })
    expect(first.text()).not.toContain(t('clubSetup.back'))
    expect(first.get('button[type="submit"]').text()).toBe(t('clubSetup.continue.shop'))
    first.unmount()
    const last = await mountIt(FormStep, { ...formProps, step: 'reward' })
    expect(last.text()).toContain(t('clubSetup.back'))
    expect(last.get('button[type="submit"]').text()).toBe(t('clubSetup.create'))
  })

  it('emits submit from the form and back from the back button', async () => {
    const page = await mountIt(FormStep, formProps)
    await page.get('form').trigger('submit')
    expect(page.emitted('submit')).toHaveLength(1)
    await button(page, t('clubSetup.back')).trigger('click')
    expect(page.emitted('back')).toHaveLength(1)
  })

  it('locks the fields and the back button while the club is being created', async () => {
    const page = await mountIt(FormStep, { ...formProps, creating: true })
    expect(page.get('fieldset').attributes('disabled')).toBeDefined()
    expect(button(page, t('clubSetup.back')).attributes('disabled')).toBeDefined()
  })

  it('shows the error for the code as an alert, with a link back to sign-in only for an expired sign-up', async () => {
    const generic = await mountIt(FormStep, { ...formProps, submitError: 'network' })
    expect(generic.get('[role="alert"]').text()).toContain(t('errors.network'))
    expect(generic.text()).not.toContain(t('clubSetup.confirmPhoneAgain'))
    generic.unmount()
    const expired = await mountIt(FormStep, { ...formProps, submitError: 'signUpExpired' })
    expect(expired.get('[role="alert"]').text()).toContain(t('errors.signUpExpired'))
    expect(button(expired, t('clubSetup.confirmPhoneAgain')).attributes('href')).toBe('/balcao/entrar')
  })
})

describe('club setup components: PosterStep and Poster', () => {
  const posterProps = { status: 'success', poster, isPending: false, canApprove: false }

  it('prints the poster that is loaded and links to the panel', async () => {
    const page = await mountIt(PosterStep, posterProps)
    expect(page.get('h1').text()).toBe(t('clubSetup.poster.title'))
    expect(page.text()).toContain(t('clubSetup.poster.approved'))
    expect(button(page, t('clubSetup.poster.goToPanel')).attributes('href')).toBe('/painel')
    await button(page, t('clubSetup.poster.print')).trigger('click')
    expect(page.emitted('print')).toHaveLength(1)
  })

  it('cannot print before the poster exists, and shows a labelled loading placeholder', async () => {
    const page = await mountIt(PosterStep, { status: 'loading', poster: null, isPending: false, canApprove: false })
    expect(button(page, t('clubSetup.poster.print')).attributes('disabled')).toBeDefined()
    expect(page.get('[role="status"]').attributes('aria-label')).toBe(t('common.loading'))
  })

  it('shows a retryable alert when the poster failed to load', async () => {
    const page = await mountIt(PosterStep, { status: 'error', poster: null, isPending: false, canApprove: false })
    expect(page.get('[role="alert"]').text()).toContain(t('clubSetup.poster.loadError'))
    await button(page, t('common.retry')).trigger('click')
    expect(page.emitted('retry')).toHaveLength(1)
  })

  it('says the shop awaits approval, offering to approve only for testing builds', async () => {
    const closed = await mountIt(PosterStep, { ...posterProps, isPending: true })
    expect(closed.text()).toContain(t('merchantNav.pending.title'))
    expect(closed.text()).not.toContain(t('clubSetup.poster.approved'))
    expect(closed.text()).not.toContain(t('merchantNav.pending.approveForTesting'))
    closed.unmount()
    const testing = await mountIt(PosterStep, { ...posterProps, isPending: true, canApprove: true })
    await button(testing, t('merchantNav.pending.approveForTesting')).trigger('click')
    expect(testing.emitted('approve')).toHaveLength(1)
  })

  it('draws the poster with the shop, the headline, the labelled QR and the readable code', async () => {
    const page = await mountIt(Poster, { poster })
    expect(page.get('h2').text()).toBe('Lava-jato Brilho')
    expect(page.text()).toContain(poster.headline)
    expect(page.text()).toContain('ABC123')
    const qr = page.get('svg[role="img"]')
    expect(qr.attributes('aria-label')).toBe('QR code do check-in')
    expect(qr.attributes('viewBox')).toBe('0 0 21 21')
  })
})

describe('club setup components: shop, rules and reward steps', () => {
  it('writes the typed shop fields back as a new shop, keeping the others', async () => {
    const { shop } = emptyClubSetupForm()
    const page = await mountIt(ShopFields, { shop, errors: {} })
    const name = page.get('input[name="name"]')
    await name.setValue('Lava-jato Brilho')
    expect(page.emitted('update:shop')?.at(-1)?.[0]).toEqual({ ...shop, name: 'Lava-jato Brilho' })
    await page.get('input[name="neighborhood"]').setValue('Centro')
    expect(page.emitted('update:shop')?.at(-1)?.[0]).toEqual({ ...shop, name: 'Lava-jato Brilho', neighborhood: 'Centro' })
  })

  it('shows one error per invalid field, with the limit, and none otherwise', async () => {
    const { shop } = emptyClubSetupForm()
    const clean = await mountIt(ShopFields, { shop, errors: {} })
    expect(clean.text()).not.toContain(t('clubSetup.shop.categoryError'))
    clean.unmount()
    const invalid = await mountIt(ShopFields, { shop, errors: { category: true, name: true } })
    expect(invalid.text()).toContain(t('clubSetup.shop.categoryError'))
    expect(invalid.text()).toContain(t('clubSetup.shop.nameError', { max: SHOP_NAME_MAX_LENGTH }))
    expect(invalid.text()).not.toContain(t('clubSetup.shop.addressError', { max: SHOP_ADDRESS_MAX_LENGTH }))
  })

  it('wraps the shop fields in the shop module', async () => {
    const { shop } = emptyClubSetupForm()
    const page = await mountIt(ShopStep, { shop, errors: {} })
    expect(page.get('h2').text()).toBe(t('clubSetup.shop.module'))
    expect(page.find('input[name="name"]').exists()).toBe(true)
  })

  it('lets the merchant pick the program mode, without locking any of them', async () => {
    const { program } = emptyClubSetupForm()
    const page = await mountIt(RulesStep, { program, options, errors: {} })
    expect(page.text()).toContain(t('program.earn.title'))
    expect(page.text()).toContain(t('program.visitRules.title'))
    expect(page.text()).not.toContain(t('program.card.locked'))
    const radios = page.findAll('[role="radio"]')
    expect(radios).toHaveLength(3)
    expect(radios.every((radio) => radio.attributes('disabled') === undefined)).toBe(true)
    await radios[1]?.trigger('click')
    expect(page.emitted('mode')?.[0]).toEqual(['pointsPerCurrency'])
  })

  it('asks for the reward and the bonus rules', async () => {
    const { program } = emptyClubSetupForm()
    const page = await mountIt(RewardStep, { program, options, errors: {} })
    expect(page.text()).toContain(t('program.reward.title'))
    expect(page.text()).toContain(t('program.bonus.title'))
    expect(page.find('input[name="rewardTitle"], input[maxlength]').exists()).toBe(true)
  })

  it('flags the reward title when it is invalid', async () => {
    const { program } = emptyClubSetupForm()
    const page = await mountIt(RewardStep, { program, options, errors: { rewardTitle: true } })
    expect(page.text()).toContain(t('program.errors.rewardTitle', { max: REWARD_TITLE_MAX_LENGTH }))
  })
})
