import { afterEach, describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { useNuxtApp } from '#imports'
import { typeCode } from '#layers/core/test/pageHarness.nuxt'
import CodeForm from '../app/components/check-in/CodeForm.vue'
import EarnedStep from '../app/components/check-in/EarnedStep.vue'
import Notice from '../app/components/check-in/Notice.vue'
import ScanStep from '../app/components/check-in/ScanStep.vue'
import type { CheckInEarnedView, CheckInNoticeModel } from '../app/types/checkIn'

function t(key: string, named?: Record<string, unknown>): string {
  return useNuxtApp().$i18n.t(key, named ?? {})
}

let wrapper: VueWrapper | undefined

async function mountIt(component: Parameters<typeof mountSuspended>[0], props: Record<string, unknown>): Promise<VueWrapper> {
  wrapper = await mountSuspended(component, { props, attachTo: document.body })
  await flushPromises()
  return wrapper
}

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
})

function button(page: VueWrapper, label: string): ReturnType<VueWrapper['get']> {
  const found = page.findAll('a, button').find((item) => item.text() === label)
  if (!found) throw new Error(`"${label}" missing`)
  return found
}

function cells(page: VueWrapper): ReturnType<VueWrapper['findAll']> {
  return page.findAll('input:not([aria-hidden="true"])')
}

describe('check-in components: Notice', () => {
  const notice = (overrides: Partial<CheckInNoticeModel>): CheckInNoticeModel => ({
    tone: 'error',
    icon: 'i-ph-qr-code',
    title: 'Esse QR não é de uma loja',
    message: 'Escaneie o cartaz do balcão.',
    recovery: 'scanAgain',
    ...overrides,
  })

  it('is an alert that shows the title and the message', async () => {
    const page = await mountIt(Notice, { notice: notice({}) })
    expect(page.get('[role="alert"]').text()).toContain('Esse QR não é de uma loja')
    expect(page.get('h2').text()).toBe('Esse QR não é de uma loja')
    expect(page.text()).toContain('Escaneie o cartaz do balcão.')
  })

  it('offers scan again and type the code, emitting recover and typeCode', async () => {
    const page = await mountIt(Notice, { notice: notice({}) })
    await button(page, t('checkIn.scanAgain')).trigger('click')
    await button(page, t('checkIn.typeCode')).trigger('click')
    expect(page.emitted('recover')).toHaveLength(1)
    expect(page.emitted('typeCode')).toHaveLength(1)
  })

  it('offers retry instead of scan again for a network failure', async () => {
    const page = await mountIt(Notice, { notice: notice({ recovery: 'retry', icon: 'i-ph-wifi-slash' }) })
    await button(page, t('common.retry')).trigger('click')
    expect(page.emitted('recover')).toHaveLength(1)
    expect(page.text()).not.toContain(t('checkIn.scanAgain'))
  })

  it('only links to the wallet, with no way to try again, when the recovery is the wallet', async () => {
    const page = await mountIt(Notice, { notice: notice({ tone: 'warning', recovery: 'wallet' }) })
    const link = button(page, t('checkIn.toWallet'))
    expect(link.attributes('href')).toBe('/carteira')
    expect(page.text()).not.toContain(t('checkIn.typeCode'))
    expect(page.text()).not.toContain(t('checkIn.scanAgain'))
  })

  it('colours the icon by tone and hides it from screen readers', async () => {
    const warning = await mountIt(Notice, { notice: notice({ tone: 'warning' }) })
    expect(warning.get('[aria-hidden="true"]').classes()).toContain('text-warning')
    warning.unmount()
    const error = await mountIt(Notice, { notice: notice({ tone: 'error' }) })
    expect(error.get('[aria-hidden="true"]').classes()).toContain('text-error')
  })
})

describe('check-in components: ScanStep', () => {
  it.each([
    ['starting', 'checkIn.cameraStarting'],
    ['scanning', 'checkIn.cameraScanning'],
    ['busy', 'checkIn.submitting'],
  ] as const)('shows the %s status text', async (status, key) => {
    const page = await mountIt(ScanStep, { status })
    expect(page.text()).toContain(t(key))
  })

  it('hands the video element to the screen when mounted and takes it back when unmounted', async () => {
    const page = await mountIt(ScanStep, { status: 'starting' })
    const first = page.emitted('video')?.[0]?.[0]
    expect(first).toBeInstanceOf(HTMLVideoElement)
    page.unmount()
    wrapper = undefined
    expect(page.emitted('video')?.at(-1)).toEqual([null])
  })

  it('emits typeCode from the type-instead button', async () => {
    const page = await mountIt(ScanStep, { status: 'starting' })
    await button(page, t('checkIn.typeCode')).trigger('click')
    expect(page.emitted('typeCode')).toHaveLength(1)
  })
})

describe('check-in components: CodeForm', () => {
  const formProps = { cameraIssue: null, invalid: false, typing: false, focusRequest: null, code: [] }

  it('has a labelled group of six cells and a submit button', async () => {
    const page = await mountIt(CodeForm, formProps)
    expect(page.text()).toContain(t('checkIn.codeLabel'))
    expect(cells(page)).toHaveLength(6)
    expect(page.get('button[type="submit"]').text()).toBe(t('checkIn.submit'))
  })

  it('shows the invalid code message and flags the field', async () => {
    const page = await mountIt(CodeForm, { ...formProps, invalid: true })
    expect(page.text()).toContain(t('checkIn.invalidCode'))
  })

  it('disables the cells and shows loading on submit while typing is being checked', async () => {
    const page = await mountIt(CodeForm, { ...formProps, typing: true })
    expect(cells(page).every((cell) => cell.attributes('disabled') !== undefined)).toBe(true)
  })

  it('explains a denied camera and still offers to go back to it', async () => {
    const page = await mountIt(CodeForm, { ...formProps, cameraIssue: 'denied' })
    expect(page.text()).toContain(t('checkIn.cameraDenied'))
    expect(page.text()).toContain(t('checkIn.useCamera'))
  })

  it('does not offer the camera again when there is none', async () => {
    const page = await mountIt(CodeForm, { ...formProps, cameraIssue: 'unavailable' })
    expect(page.text()).toContain(t('checkIn.cameraUnavailable'))
    expect(page.text()).not.toContain(t('checkIn.useCamera'))
  })

  it('emits submit from the form and switchToCamera from the ghost button', async () => {
    const page = await mountIt(CodeForm, formProps)
    await page.get('form').trigger('submit')
    expect(page.emitted('submit')).toHaveLength(1)
    await button(page, t('checkIn.useCamera')).trigger('click')
    expect(page.emitted('switchToCamera')).toHaveLength(1)
  })

  it('emits the typed code in capitals, one character per cell, and submits when complete', async () => {
    const page = await mountIt(CodeForm, {
      ...formProps,
      'onUpdate:code': (value: string[]) => wrapper?.setProps({ code: value }),
    })
    await typeCode(page.element, 'nav4k7')
    expect(page.emitted('update:code')?.at(-1)?.[0]).toEqual([...'nav4k7'])
    expect(page.emitted('submit')?.length).toBeGreaterThanOrEqual(1)
  })

  it('brings the focus back to the first cell for a code request', async () => {
    const page = await mountIt(CodeForm, formProps)
    // A casa do código já nasce com autofocus: tira o foco antes de pedir.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    expect(document.activeElement).not.toBe(cells(page)[0]?.element)
    await page.setProps({ focusRequest: { target: 'code', id: 1 } })
    await flushPromises()
    expect(document.activeElement).toBe(cells(page)[0]?.element)
  })
})

describe('check-in components: EarnedStep', () => {
  const earned = (overrides: Partial<CheckInEarnedView> & { cheer?: string | null } = {}): CheckInEarnedView => {
    const { cheer = null, ...rest } = overrides
    return {
      text: {
        moment: 'earned',
        title: 'Carimbo ganho!',
        lead: 'Barbearia Navalha',
        cheer,
        next: 'Volte em breve.',
        announcement: 'Você ganhou 1 carimbo.',
      },
      card: null,
      heroStamp: { icon: 'i-ph-seal-check-bold', tilt: 1, tone: 'ink' },
      rewardCardId: null,
      ...rest,
    }
  }

  it('is a section named by its heading, which can take the focus', async () => {
    const page = await mountIt(EarnedStep, { earned: earned(), focusRequest: null })
    expect(page.get('section').attributes('aria-labelledby')).toBe('earned-title')
    expect(page.get('#earned-title').text()).toBe('Carimbo ganho!')
    expect(page.text()).toContain('Barbearia Navalha')
    expect(page.text()).toContain('Volte em breve.')
  })

  it('moves the focus to the heading only for an earned heading request', async () => {
    const page = await mountIt(EarnedStep, { earned: earned(), focusRequest: null })
    await page.setProps({ focusRequest: { target: 'code', id: 1 } })
    await flushPromises()
    expect(document.activeElement).not.toBe(page.get('#earned-title').element)
    await page.setProps({ focusRequest: { target: 'earnedHeading', id: 2 } })
    await flushPromises()
    expect(document.activeElement).toBe(page.get('#earned-title').element)
  })

  it('shows the cheer only when there is one', async () => {
    const without = await mountIt(EarnedStep, { earned: earned(), focusRequest: null })
    expect(without.find('p.letreiro').exists()).toBe(false)
    without.unmount()
    const withCheer = await mountIt(EarnedStep, { earned: earned({ cheer: 'Falta só 1 carimbo!' }), focusRequest: null })
    expect(withCheer.get('p.letreiro').text()).toBe('Falta só 1 carimbo!')
  })

  it('links the main button to the wallet when there is no reward to redeem', async () => {
    const page = await mountIt(EarnedStep, { earned: earned(), focusRequest: null })
    expect(button(page, t('checkIn.toWallet')).attributes('href')).toBe('/carteira')
    expect(page.text()).not.toContain(t('checkIn.earned.redeem'))
  })

  it('puts the redeem button first, linking the card, when the reward was unlocked', async () => {
    const page = await mountIt(EarnedStep, {
      earned: earned({ rewardCardId: 'card_1' as CheckInEarnedView['rewardCardId'] }),
      focusRequest: null,
    })
    const links = page.findAll('a')
    expect(links[0]?.text()).toBe(t('checkIn.earned.redeem'))
    expect(links[0]?.attributes('href')).toBe('/premios/card_1')
    expect(button(page, t('checkIn.toWallet')).attributes('href')).toBe('/carteira')
  })
})
