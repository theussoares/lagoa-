import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { useNuxtApp } from '#imports'
import { mountComponent, unmountAll } from '#layers/core/test/componentHarness.nuxt'
import { typeCode, typeInto } from '#layers/core/test/pageHarness.nuxt'
import { MaskedPhoneSchema } from '#shared/schemas/phone'
import AmountField from '../app/components/counter/AmountField.vue'
import CounterLedger from '../app/components/counter/CounterLedger.vue'
import LaunchFeedback from '../app/components/counter/LaunchFeedback.vue'
import LaunchForm from '../app/components/counter/LaunchForm.vue'
import LaunchPanel from '../app/components/counter/LaunchPanel.vue'
import LaunchReceipt from '../app/components/counter/LaunchReceipt.vue'
import LedgerPanel from '../app/components/counter/LedgerPanel.vue'
import RedemptionPanel from '../app/components/counter/RedemptionPanel.vue'
import RedemptionStatus from '../app/components/counter/RedemptionStatus.vue'
import type { CounterAction, CounterLedgerEntryModel, CounterRedemptionPreviewModel, LaunchReceiptModel } from '../app/types/counter'

function t(key: string, named?: Record<string, unknown>, plural?: number): string {
  return useNuxtApp().$i18n.t(key, named ?? {}, plural ?? 1)
}

const mountIt = mountComponent

afterEach(unmountAll)

const rulerReceipt: LaunchReceiptModel = {
  tone: 'ink',
  tilt: 1,
  title: '+1 carimbo para (67) 9••••-0002',
  detail: 'Agora tem 7 de 10.',
  body: { kind: 'ruler', balance: 7, target: 10, label: '7 de 10 carimbos' },
}

const slotsReceipt: LaunchReceiptModel = {
  tone: 'reward',
  tilt: 2,
  title: 'Prêmio liberado',
  detail: 'Avise o cliente.',
  body: {
    kind: 'slots',
    slots: [1, 2, 3].map((number) => ({
      number,
      stamped: number < 3,
      isRewardSlot: number === 3,
      tilt: 0,
      fresh: number === 2,
      delayMs: 0,
    })),
  },
}

const visitAction: CounterAction = { kind: 'visit', unit: 'stamp', units: 1 }
const amountAction: CounterAction = { kind: 'amount', pointsPerReal: 1 }

const formProps = {
  phone: '',
  amountText: '',
  action: visitAction,
  submitLabel: 'Dar 1 carimbo',
  pending: false,
  phoneErrorCode: null,
  amountErrorCode: null,
  focusRequest: null,
}

function codeCells(page: VueWrapper): ReturnType<VueWrapper['findAll']> {
  return page.findAll('input:not([aria-hidden="true"])')
}

function button(page: VueWrapper, label: string): ReturnType<VueWrapper['get']> {
  const found = page.findAll('button').find((item) => item.text() === label)
  if (!found) throw new Error(`button "${label}" missing`)
  return found
}

describe('counter components: LaunchFeedback', () => {
  const feedbackProps = { alertCode: null, programFailed: false, receipt: null }

  it('keeps the polite live region mounted, empty, when there is nothing to say', async () => {
    const page = await mountIt(LaunchFeedback, feedbackProps)
    const region = page.get('[aria-live="polite"]')
    expect(region.text()).toBe('')
    expect(region.classes()).toContain('empty:hidden')
  })

  it('shows the error for the code inside the live region', async () => {
    const page = await mountIt(LaunchFeedback, { ...feedbackProps, alertCode: 'shopPendingApproval' })
    expect(page.get('[aria-live="polite"]').text()).toContain(t('errors.shopPendingApproval'))
  })

  it('offers to retry when the program failed to load', async () => {
    const page = await mountIt(LaunchFeedback, { ...feedbackProps, programFailed: true })
    expect(page.text()).toContain(t('counter.launch.programProblem'))
    await button(page, t('common.retry')).trigger('click')
    expect(page.emitted('retryProgram')).toHaveLength(1)
  })

  it('shows the receipt when everything went well', async () => {
    const page = await mountIt(LaunchFeedback, { ...feedbackProps, receipt: { key: 'visit_1', model: rulerReceipt } })
    expect(page.text()).toContain(rulerReceipt.title)
    expect(page.text()).toContain(rulerReceipt.detail)
  })

  it('puts an error before a program failure and a program failure before the receipt', async () => {
    const receipt = { key: 'visit_1', model: rulerReceipt }
    const withAlert = await mountIt(LaunchFeedback, { alertCode: 'unauthorized', programFailed: true, receipt })
    expect(withAlert.text()).toContain(t('errors.unauthorized'))
    expect(withAlert.text()).not.toContain(t('counter.launch.programProblem'))
    expect(withAlert.text()).not.toContain(rulerReceipt.title)
    withAlert.unmount()
    const withProgram = await mountIt(LaunchFeedback, { alertCode: null, programFailed: true, receipt })
    expect(withProgram.text()).toContain(t('counter.launch.programProblem'))
    expect(withProgram.text()).not.toContain(rulerReceipt.title)
  })
})

describe('counter components: LaunchReceipt', () => {
  it('shows a ruler for a points or long card, hiding no information from the reader', async () => {
    const page = await mountIt(LaunchReceipt, { receipt: rulerReceipt, icon: 'i-ph-check-fat-bold' })
    expect(page.text()).toContain(rulerReceipt.title)
    expect(page.find('ol[aria-hidden="true"]').exists()).toBe(false)
    expect(page.html()).toContain(rulerReceipt.body.kind === 'ruler' ? rulerReceipt.body.label : '')
  })

  it('shows one slot per card house, hidden from screen readers, and the reward colour', async () => {
    const page = await mountIt(LaunchReceipt, { receipt: slotsReceipt, icon: 'i-ph-check-fat-bold' })
    const slots = page.get('ol[aria-hidden="true"]')
    expect(slots.findAll('li')).toHaveLength(3)
    expect(page.get('p.letreiro').classes()).toContain('text-secondary')
  })
})

describe('counter components: AmountField', () => {
  const amountProps = { amountText: '', errorCode: null, focusRequest: null }

  it('has a labelled field that keeps the virtual keyboard closed', async () => {
    const page = await mountIt(AmountField, { ...amountProps, hint: '1 ponto por real' })
    const input = page.get('input')
    expect(page.get('label').text()).toBe(t('counter.launch.amountLabel'))
    expect(input.attributes('inputmode')).toBe('none')
    expect(page.text()).toContain('1 ponto por real')
  })

  it('shows the amount error and marks the field invalid', async () => {
    const page = await mountIt(AmountField, { ...amountProps, errorCode: 'invalidAmount' })
    expect(page.text()).toContain(t('errors.invalidAmount'))
    expect(page.get('input').attributes('aria-invalid')).toBe('true')
  })

  it('emits typed text, focus and the Esc clear request', async () => {
    const page = await mountIt(AmountField, amountProps)
    const input = page.get('input')
    await typeInto(input.element as HTMLInputElement, '2490')
    expect(page.emitted('input')?.[0]).toEqual(['2490'])
    await input.trigger('focus')
    expect(page.emitted('fieldFocus')).toHaveLength(1)
    await input.trigger('keydown', { key: 'Escape' })
    expect(page.emitted('clear')).toHaveLength(1)
  })

  it('takes the focus only for an amount request', async () => {
    const page = await mountIt(AmountField, amountProps)
    await page.setProps({ focusRequest: { target: 'phone', id: 1 } })
    await flushPromises()
    expect(document.activeElement).not.toBe(page.get('input').element)
    await page.setProps({ focusRequest: { target: 'amount', id: 2 } })
    await flushPromises()
    expect(document.activeElement).toBe(page.get('input').element)
  })
})

describe('counter components: LaunchForm', () => {
  it('shows the phone field, the keypad and the submit label from props', async () => {
    const page = await mountIt(LaunchForm, formProps)
    expect(page.get('label').text()).toBe(t('counter.launch.phoneLabel'))
    expect(page.get('button[type="submit"]').text()).toBe('Dar 1 carimbo')
    expect(page.find('input[inputmode="none"]:not([type="tel"])').exists()).toBe(false)
    expect(page.findAll('button[type="button"]')).toHaveLength(12)
  })

  it('adds the amount field only when the action asks for the amount', async () => {
    const page = await mountIt(LaunchForm, { ...formProps, action: amountAction, submitLabel: 'Lançar valor' })
    expect(page.find('input[inputmode="none"]:not([type="tel"])').exists()).toBe(true)
  })

  it('disables submit while there is no action and shows the pending state', async () => {
    const page = await mountIt(LaunchForm, { ...formProps, action: null })
    expect(page.get('button[type="submit"]').attributes('disabled')).toBeDefined()
    await page.setProps({ action: visitAction, pending: true })
    expect(page.get('button[type="submit"]').attributes('disabled')).toBeDefined()
    expect(page.findAll('button[type="button"]').every((key) => key.attributes('disabled') !== undefined)).toBe(true)
  })

  it('marks the phone invalid with the error text', async () => {
    const page = await mountIt(LaunchForm, { ...formProps, phoneErrorCode: 'invalidPhone' })
    expect(page.text()).toContain(t('errors.invalidPhone'))
    expect(page.get('input[type="tel"]').attributes('aria-invalid')).toBe('true')
  })

  it('emits the form submit, the keypad keys and the clear request', async () => {
    const page = await mountIt(LaunchForm, formProps)
    await page.get('form').trigger('submit')
    expect(page.emitted('submit')).toHaveLength(1)
    await button(page, '7').trigger('click')
    expect(page.emitted('digit')?.[0]).toEqual(['7'])
    await page.get(`button[aria-label="${t('counter.launch.keypadBackspace')}"]`).trigger('click')
    expect(page.emitted('backspace')).toHaveLength(1)
    await button(page, t('counter.launch.keypadClear')).trigger('click')
    expect(page.emitted('clear')).toHaveLength(1)
  })

  it('updates the phone model with only the digits typed and announces the focus', async () => {
    const page = await mountIt(LaunchForm, formProps)
    const phone = page.get('input[type="tel"]')
    await phone.trigger('focusin')
    expect(page.emitted('fieldFocus')?.[0]).toEqual(['phone'])
    await typeInto(phone.element as HTMLInputElement, '(67) 9000')
    expect(page.emitted('update:phone')?.[0]).toEqual(['679000'])
  })

  it('focuses the phone field for a phone request', async () => {
    const page = await mountIt(LaunchForm, formProps)
    await page.setProps({ focusRequest: { target: 'phone', id: 1 } })
    await flushPromises()
    expect(document.activeElement).toBe(page.get('input[type="tel"]').element)
  })
})

describe('counter components: LaunchPanel', () => {
  it('composes the form and the feedback and passes their events up', async () => {
    const page = await mountIt(LaunchPanel, {
      ...formProps,
      alertCode: null,
      programFailed: true,
      receipt: null,
    })
    expect(page.get('h2').text()).toBe(t('counter.launch.title'))
    await button(page, t('common.retry')).trigger('click')
    expect(page.emitted('retryProgram')).toHaveLength(1)
    await page.get('form').trigger('submit')
    expect(page.emitted('submit')).toHaveLength(1)
  })
})

describe('counter components: RedemptionStatus', () => {
  const preview: CounterRedemptionPreviewModel = {
    rewardTitle: 'Pizza média',
    customerLine: '(67) 9••••-0001 · vale até 14:32',
    confirming: false,
  }
  const statusProps = { status: 'idle', errorCode: null, preview: null, deliveredReward: null }

  it('keeps the polite live region mounted and empty while idle', async () => {
    const page = await mountIt(RedemptionStatus, statusProps)
    expect(page.get('[aria-live="polite"]').text()).toBe('')
  })

  it('announces that the code is being checked', async () => {
    const page = await mountIt(RedemptionStatus, { ...statusProps, status: 'checking' })
    expect(page.get('[aria-live="polite"]').text()).toContain(t('counter.redemption.checking'))
  })

  it('shows the error for the code', async () => {
    const page = await mountIt(RedemptionStatus, { ...statusProps, status: 'error', errorCode: 'redemptionExpired' })
    expect(page.get('[aria-live="polite"]').text()).toContain(t('errors.redemptionExpired'))
  })

  it('shows the checked ticket with the masked phone, and emits deliver and cancel', async () => {
    const page = await mountIt(RedemptionStatus, { ...statusProps, status: 'preview', preview })
    const text = page.text()
    expect(text).toContain(t('counter.redemption.valid'))
    expect(text).toContain('Pizza média')
    expect(text).toContain('(67) 9••••-0001')
    await button(page, t('counter.redemption.deliver')).trigger('click')
    await button(page, t('counter.redemption.cancel')).trigger('click')
    expect(page.emitted('deliver')).toHaveLength(1)
    expect(page.emitted('cancel')).toHaveLength(1)
  })

  it('blocks cancelling while the delivery is being confirmed', async () => {
    const page = await mountIt(RedemptionStatus, { ...statusProps, status: 'confirming', preview: { ...preview, confirming: true } })
    expect(button(page, t('counter.redemption.cancel')).attributes('disabled')).toBeDefined()
  })

  it('confirms the delivery with the reward name', async () => {
    const page = await mountIt(RedemptionStatus, { ...statusProps, status: 'delivered', deliveredReward: 'Pizza média' })
    expect(page.get('[aria-live="polite"]').text()).toContain(t('counter.redemption.delivered', { reward: 'Pizza média' }))
  })
})

describe('counter components: RedemptionPanel', () => {
  const panelProps = { status: 'idle', errorCode: null, preview: null, deliveredReward: null, focusRequest: null, code: [] }

  it('labels the section and the code cells', async () => {
    const page = await mountIt(RedemptionPanel, panelProps)
    expect(page.get('h2').text()).toBe(t('counter.redemption.title'))
    expect(codeCells(page)).toHaveLength(6)
    expect(page.find('[aria-live="polite"]').exists()).toBe(true)
  })

  it('emits complete when the six cells are filled, uppercasing what was typed', async () => {
    let current: VueWrapper | undefined
    const page = await mountIt(RedemptionPanel, {
      ...panelProps,
      'onUpdate:code': (value: string[]) => void current?.setProps({ code: value }),
    })
    current = page
    await typeCode(page.element, 'acdefg')
    // O campo de código pode avisar mais de uma vez; quem valida (useRedemptionCheck) ignora o repetido.
    expect(page.emitted('complete')?.length).toBeGreaterThanOrEqual(1)
    expect(page.emitted('update:code')?.at(-1)?.[0]).toEqual([...'ACDEFG'])
  })

  it('emits cancel on Esc', async () => {
    const page = await mountIt(RedemptionPanel, panelProps)
    await page.get('section').trigger('keydown', { key: 'Escape' })
    expect(page.emitted('cancel')).toHaveLength(1)
  })

  it('disables the cells while checking or confirming', async () => {
    const page = await mountIt(RedemptionPanel, { ...panelProps, status: 'checking' })
    expect(codeCells(page).every((cell) => cell.attributes('disabled') !== undefined)).toBe(true)
    await page.setProps({ status: 'idle' })
    expect(codeCells(page).every((cell) => cell.attributes('disabled') === undefined)).toBe(true)
  })

  it('takes the focus only for a redemption code request', async () => {
    const page = await mountIt(RedemptionPanel, panelProps)
    await page.setProps({ focusRequest: { target: 'phone', id: 1 } })
    await flushPromises()
    expect(document.activeElement).not.toBe(codeCells(page)[0]?.element)
    await page.setProps({ focusRequest: { target: 'redemptionCode', id: 2 } })
    await flushPromises()
    expect(document.activeElement).toBe(codeCells(page)[0]?.element)
  })
})

describe('counter components: LedgerPanel and CounterLedger', () => {
  const rows: CounterLedgerEntryModel[] = [
    {
      id: 'visit_1',
      time: '14:32',
      phone: MaskedPhoneSchema.parse('(67) 9••••-0374'),
      badge: 'Cliente novo',
      action: '+1 carimbo',
      tone: 'ink',
      icon: 'i-ph-check-fat-bold',
      tilt: 1,
      fresh: true,
    },
    {
      id: 'visit_2',
      time: '14:10',
      phone: MaskedPhoneSchema.parse('(67) 9••••-0002'),
      badge: null,
      action: 'Prêmio entregue: Corte grátis',
      tone: 'reward',
      icon: 'i-ph-gift-bold',
      tilt: 2,
      fresh: false,
    },
  ]

  it('shows masked phones, times, the new customer badge and the action', async () => {
    const page = await mountIt(CounterLedger, { entries: rows })
    const items = page.findAll('li')
    expect(items).toHaveLength(2)
    expect(items[0]?.text()).toContain('14:32')
    expect(items[0]?.text()).toContain('(67) 9••••-0374')
    expect(items[0]?.text()).toContain('Cliente novo')
    expect(items[1]?.text()).toContain('Prêmio entregue: Corte grátis')
    expect(items[1]?.text()).not.toContain('Cliente novo')
  })

  it('keeps every ledger row at least 56px tall', async () => {
    const page = await mountIt(CounterLedger, { entries: rows })
    expect(page.findAll('li').every((item) => item.classes().includes('min-h-14'))).toBe(true)
  })

  it('shows a skeleton while loading, with no count', async () => {
    const page = await mountIt(LedgerPanel, { status: 'loading', errorCode: null, rows: [] })
    expect(page.find('ol').exists()).toBe(false)
    expect(page.text()).not.toContain(t('counter.todayCount', { count: 0 }, 0))
    expect(page.get('button').attributes('disabled')).toBeDefined()
  })

  it('shows an alert with retry for an error and emits reload from it', async () => {
    const page = await mountIt(LedgerPanel, { status: 'error', errorCode: 'network', rows: [] })
    expect(page.get('[role="alert"]').text()).toContain(t('errors.network'))
    await button(page, t('common.retry')).trigger('click')
    expect(page.emitted('reload')).toHaveLength(1)
  })

  it('says the day is still empty when there are no rows', async () => {
    const page = await mountIt(LedgerPanel, { status: 'success', errorCode: null, rows: [] })
    expect(page.text()).toContain(t('counter.ledger.empty'))
  })

  it('lists the rows in a keyboard-focusable named region with the count', async () => {
    const page = await mountIt(LedgerPanel, { status: 'success', errorCode: null, rows })
    const region = page.get('[role="region"]')
    expect(region.attributes('tabindex')).toBe('0')
    expect(region.attributes('aria-label')).toBe(t('counter.ledger.title'))
    expect(region.findAll('li')).toHaveLength(2)
    expect(page.text()).toContain(t('counter.todayCount', { count: 2 }, 2))
    await page.get(`button[aria-label="${t('counter.ledger.refresh')}"]`).trigger('click')
    expect(page.emitted('reload')).toHaveLength(1)
  })
})
