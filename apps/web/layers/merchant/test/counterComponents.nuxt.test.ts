import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { useNuxtApp } from '#imports'
import { mountComponent, unmountAll } from '#layers/core/test/componentHarness.nuxt'
import { typeCode, typeInto } from '#layers/core/test/pageHarness.nuxt'
import { MaskedPhoneSchema } from '#shared/schemas/phone'
import AmountField from '../app/components/counter/AmountField.vue'
import CounterLedger from '../app/components/counter/CounterLedger.vue'
import LedgerPanel from '../app/components/counter/LedgerPanel.vue'
import RedemptionPanel from '../app/components/counter/RedemptionPanel.vue'
import RedemptionStatus from '../app/components/counter/RedemptionStatus.vue'
import VisitQrCard from '../app/components/counter/VisitQrCard.vue'
import VisitQrFeedback from '../app/components/counter/VisitQrFeedback.vue'
import VisitQrIssueForm from '../app/components/counter/VisitQrIssueForm.vue'
import VisitQrPanel from '../app/components/counter/VisitQrPanel.vue'
import VisitQrReceipt from '../app/components/counter/VisitQrReceipt.vue'
import type { CounterAction, CounterLedgerEntryModel, CounterRedemptionPreviewModel, LaunchReceiptModel } from '../app/types/counter'
import type { VisitQrDisplayModel } from '../app/types/visitQr'

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
  amountText: '',
  action: visitAction,
  issueLabel: 'Gerar QR da visita',
  pending: false,
  amountErrorCode: null,
  focusRequest: null,
}

const activeDisplay: VisitQrDisplayModel = {
  qr: { size: 29, d: 'M4 4h1v1h-1z' },
  qrLabel: 'QR da visita, vale até 12:05',
  visitCode: 'K7M2Q',
  status: 'active',
  statusLabel: 'Aguardando o cliente',
  countdown: 'Vence em 4:12',
  refusal: null,
  receipt: null,
}

const panelProps = {
  ...formProps,
  alertCode: null,
  programFailed: false,
  display: null,
  canSimulate: false,
}

function codeCells(page: VueWrapper): ReturnType<VueWrapper['findAll']> {
  return page.findAll('input:not([aria-hidden="true"])')
}

function button(page: VueWrapper, label: string): ReturnType<VueWrapper['get']> {
  const found = page.findAll('button').find((item) => item.text() === label)
  if (!found) throw new Error(`button "${label}" missing`)
  return found
}

describe('counter components: VisitQrFeedback', () => {
  const feedbackProps = { alertCode: null, programFailed: false }

  it('keeps the polite live region mounted, empty, when there is nothing to say', async () => {
    const page = await mountIt(VisitQrFeedback, feedbackProps)
    const region = page.get('[aria-live="polite"]')
    expect(region.text()).toBe('')
    expect(region.classes()).toContain('empty:hidden')
  })

  it('shows the error for the code inside the live region', async () => {
    const page = await mountIt(VisitQrFeedback, { ...feedbackProps, alertCode: 'shopPendingApproval' })
    expect(page.get('[aria-live="polite"]').text()).toContain(t('errors.shopPendingApproval'))
  })

  it('offers to retry when the program failed to load', async () => {
    const page = await mountIt(VisitQrFeedback, { ...feedbackProps, programFailed: true })
    expect(page.text()).toContain(t('counter.visitQr.programProblem'))
    await button(page, t('common.retry')).trigger('click')
    expect(page.emitted('retryProgram')).toHaveLength(1)
  })

  it('puts an error before a program failure', async () => {
    const page = await mountIt(VisitQrFeedback, { alertCode: 'unauthorized', programFailed: true })
    expect(page.text()).toContain(t('errors.unauthorized'))
    expect(page.text()).not.toContain(t('counter.visitQr.programProblem'))
  })
})

describe('counter components: VisitQrReceipt', () => {
  it('shows a ruler for a points or long card, hiding no information from the reader', async () => {
    const page = await mountIt(VisitQrReceipt, { receipt: rulerReceipt, icon: 'i-ph-check-fat-bold' })
    expect(page.text()).toContain(rulerReceipt.title)
    expect(page.find('ol[aria-hidden="true"]').exists()).toBe(false)
    expect(page.html()).toContain(rulerReceipt.body.kind === 'ruler' ? rulerReceipt.body.label : '')
  })

  it('shows one slot per card house, hidden from screen readers, and the reward colour', async () => {
    const page = await mountIt(VisitQrReceipt, { receipt: slotsReceipt, icon: 'i-ph-check-fat-bold' })
    const slots = page.get('ol[aria-hidden="true"]')
    expect(slots.findAll('li')).toHaveLength(3)
    expect(page.get('p.letreiro').classes()).toContain('text-secondary')
  })
})

describe('counter components: AmountField', () => {
  const amountProps = { amountText: '', errorCode: null, focusRequest: null }

  it('has a labelled numeric field with the hint', async () => {
    const page = await mountIt(AmountField, { ...amountProps, hint: '1 ponto por real' })
    const input = page.get('input')
    expect(page.get('label').text()).toBe(t('counter.visitQr.amountLabel'))
    expect(input.attributes('inputmode')).toBe('numeric')
    expect(page.text()).toContain('1 ponto por real')
  })

  it('shows the amount error and marks the field invalid', async () => {
    const page = await mountIt(AmountField, { ...amountProps, errorCode: 'invalidAmount' })
    expect(page.text()).toContain(t('errors.invalidAmount'))
    expect(page.get('input').attributes('aria-invalid')).toBe('true')
  })

  it('emits the typed text', async () => {
    const page = await mountIt(AmountField, amountProps)
    await typeInto(page.get('input').element as HTMLInputElement, '2490')
    expect(page.emitted('input')?.[0]).toEqual(['2490'])
  })

  it('takes the focus only for an amount request', async () => {
    const page = await mountIt(AmountField, amountProps)
    await page.setProps({ focusRequest: { target: 'issueVisitQr', id: 1 } })
    await flushPromises()
    expect(document.activeElement).not.toBe(page.get('input').element)
    await page.setProps({ focusRequest: { target: 'amount', id: 2 } })
    await flushPromises()
    expect(document.activeElement).toBe(page.get('input').element)
  })
})

describe('counter components: VisitQrIssueForm', () => {
  it('has no phone field or keypad: only the lead and the issue button', async () => {
    const page = await mountIt(VisitQrIssueForm, formProps)
    expect(page.text()).toContain(t('counter.visitQr.lead', { minutes: 5 }))
    expect(page.get('button[type="submit"]').text()).toBe('Gerar QR da visita')
    expect(page.find('input').exists()).toBe(false)
    expect(page.findAll('button')).toHaveLength(1)
  })

  it('adds the amount field, the hint and the preview only in the amount mode', async () => {
    const page = await mountIt(VisitQrIssueForm, {
      ...formProps,
      action: amountAction,
      amountText: 'R$ 24,00',
      amountHint: 'Vale 1 ponto por real gasto.',
      amountPreview: 'R$ 24,00 vale 24 pontos (antes de bônus).',
    })
    expect(page.get('input').element).toBeInstanceOf(HTMLInputElement)
    expect(page.text()).toContain('Vale 1 ponto por real gasto.')
    expect(page.get('[aria-live="polite"]').text()).toContain('24 pontos')
  })

  it('disables the button while there is no action and shows the pending state', async () => {
    const page = await mountIt(VisitQrIssueForm, { ...formProps, action: null })
    expect(page.get('button[type="submit"]').attributes('disabled')).toBeDefined()
    await page.setProps({ action: visitAction, pending: true })
    expect(page.get('button[type="submit"]').attributes('disabled')).toBeDefined()
  })

  it('emits issue on submit (Enter in the amount field) and the typed amount', async () => {
    const page = await mountIt(VisitQrIssueForm, { ...formProps, action: amountAction })
    await typeInto(page.get('input').element as HTMLInputElement, '2490')
    expect(page.emitted('amountInput')?.[0]).toEqual(['2490'])
    await page.get('form').trigger('submit')
    expect(page.emitted('issue')).toHaveLength(1)
  })

  it('marks the amount invalid with the error text', async () => {
    const page = await mountIt(VisitQrIssueForm, { ...formProps, action: amountAction, amountErrorCode: 'invalidAmount' })
    expect(page.text()).toContain(t('errors.invalidAmount'))
    expect(page.get('input').attributes('aria-invalid')).toBe('true')
  })

  it('focuses the issue button for an issue request, and the amount field for an amount request', async () => {
    const page = await mountIt(VisitQrIssueForm, { ...formProps, action: amountAction })
    await page.setProps({ focusRequest: { target: 'issueVisitQr', id: 1 } })
    await flushPromises()
    expect(document.activeElement).toBe(page.get('button[type="submit"]').element)
    await page.setProps({ focusRequest: { target: 'amount', id: 2 } })
    await flushPromises()
    expect(document.activeElement).toBe(page.get('input').element)
  })
})

describe('counter components: VisitQrCard', () => {
  const cardProps = { display: activeDisplay, canSimulate: false, focusRequest: null }

  it('shows the QR with its label, the code to type, the status and the countdown', async () => {
    const page = await mountIt(VisitQrCard, cardProps)
    expect(page.get('svg[role="img"]').attributes('aria-label')).toBe(activeDisplay.qrLabel)
    expect(page.text()).toContain('K7M2Q')
    expect(page.get('[role="status"]').text()).toBe('Aguardando o cliente')
    expect(page.text()).toContain('Vence em 4:12')
  })

  it('offers print and cancel while waiting, and the test simulation only when there is one', async () => {
    const page = await mountIt(VisitQrCard, cardProps)
    expect(page.findAll('button').map((item) => item.text())).toEqual([t('counter.visitQr.print'), t('counter.visitQr.cancel')])
    await button(page, t('counter.visitQr.print')).trigger('click')
    await button(page, t('counter.visitQr.cancel')).trigger('click')
    expect(page.emitted('print')).toHaveLength(1)
    expect(page.emitted('cancel')).toHaveLength(1)
    await page.setProps({ canSimulate: true })
    await button(page, t('counter.visitQr.simulateClaim')).trigger('click')
    expect(page.emitted('simulateClaim')).toHaveLength(1)
  })

  it('keeps everything but the QR out of the printed page', async () => {
    const page = await mountIt(VisitQrCard, cardProps)
    expect(page.get('figure').classes()).not.toContain('print:hidden')
    expect(page.get('[role="status"]').element.parentElement?.classList.contains('print:hidden')).toBe(true)
    expect(page.get('button').element.parentElement?.classList.contains('print:hidden')).toBe(true)
  })

  it('shows the antifraud refusal while the QR keeps waiting', async () => {
    const refusal = 'Recusado: esse cliente já ganhou aqui. Libera hoje às 18:40.'
    const page = await mountIt(VisitQrCard, { ...cardProps, display: { ...activeDisplay, refusal } })
    expect(page.text()).toContain(refusal)
    expect(page.find('svg').exists()).toBe(true)
  })

  it('drops the QR once used and shows the receipt and the issue-another button', async () => {
    const display: VisitQrDisplayModel = {
      ...activeDisplay,
      status: 'claimed',
      statusLabel: 'Usado',
      countdown: null,
      receipt: { key: 'visit_1', model: rulerReceipt },
    }
    const page = await mountIt(VisitQrCard, { ...cardProps, display })
    expect(page.find('svg[role="img"]').exists()).toBe(false)
    expect(page.get('[role="status"]').text()).toBe('Usado')
    expect(page.text()).toContain(rulerReceipt.title)
    expect(page.findAll('button').map((item) => item.text())).toEqual([t('counter.visitQr.issueAnother')])
    await button(page, t('counter.visitQr.issueAnother')).trigger('click')
    expect(page.emitted('issueAnother')).toHaveLength(1)
  })

  it('shows expired and cancelled without a QR, and focuses the issue-another button on request', async () => {
    const display: VisitQrDisplayModel = { ...activeDisplay, status: 'expired', statusLabel: 'Vencido', countdown: null }
    const page = await mountIt(VisitQrCard, { ...cardProps, display })
    expect(page.find('svg').exists()).toBe(false)
    expect(page.text()).toContain('Vencido')
    await page.setProps({ focusRequest: { target: 'issueVisitQr', id: 1 } })
    await flushPromises()
    expect(document.activeElement).toBe(page.get('button').element)
  })
})

describe('counter components: VisitQrPanel', () => {
  it('shows the form when no QR is on the air and passes the events up', async () => {
    const page = await mountIt(VisitQrPanel, { ...panelProps, programFailed: true })
    expect(page.get('h2').text()).toBe(t('counter.visitQr.title'))
    await button(page, t('common.retry')).trigger('click')
    expect(page.emitted('retryProgram')).toHaveLength(1)
    await page.get('form').trigger('submit')
    expect(page.emitted('issue')).toHaveLength(1)
  })

  it('swaps the form for the card while a QR is on the air', async () => {
    const page = await mountIt(VisitQrPanel, { ...panelProps, display: activeDisplay })
    expect(page.find('form').exists()).toBe(false)
    expect(page.find('svg[role="img"]').exists()).toBe(true)
    await button(page, t('counter.visitQr.cancel')).trigger('click')
    expect(page.emitted('cancel')).toHaveLength(1)
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
