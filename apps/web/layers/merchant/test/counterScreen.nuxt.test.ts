import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { computed, ref, shallowRef } from 'vue'
import type { Ref } from 'vue'
import { useNuxtApp } from '#imports'
import { EXAMPLE_IDS } from '#layers/core/app/mock'
import { useSessionStore } from '#layers/core/app/stores/session'
import { useMerchantSessionStore } from '#layers/merchant/app/stores/merchantSession'
import { anaSession, barbershopSession, cafeSession, TEST_NOW } from '#layers/core/test/fixtures'
import { mountComposable } from '#layers/core/test/composableHarness.nuxt'
import { resetWorld, restoreClock } from '#layers/core/test/pageHarness.nuxt'
import type { AsyncResult, AsyncResultState } from '#layers/core/app/types/asyncResult'
import { claimVisitQr } from '#layers/core/app/mock/handlers/visitQrClaim'
import { VISIT_QR_STATUS_POLL_MS, VISIT_QR_TTL_MINUTES } from '#shared/constants/domain'
import { VisitCodeSchema, VisitQrSchema, VisitTokenSchema } from '#shared/schemas/visitQr'
import type { VisitQr } from '#shared/schemas/visitQr'
import { ProgramSchema } from '#shared/schemas/program'
import type { Program } from '#shared/schemas/program'
import { CounterEntrySchema } from '#shared/schemas/visit'
import type { CounterEntry } from '#shared/schemas/visit'
import { RedemptionPreviewSchema } from '#shared/schemas/redemption'
import type { MerchantSession } from '#shared/schemas/session'
import type { TransportError } from '#shared/types/errors'
import { useCounterLedgerView } from '../app/composables/useCounterLedgerView'
import { useCounterRedemptionView } from '../app/composables/useCounterRedemptionView'
import { useCounterScreen } from '../app/composables/useCounterScreen'
import { useVisitQr } from '../app/composables/useVisitQr'
import { useVisitQrPanel } from '../app/composables/useVisitQrPanel'
import type { CounterLedger, RedemptionCheck, RedemptionCheckState } from '../app/types/counter'
import type { VisitQrControl, VisitQrState } from '../app/types/visitQr'

const { navigateToMock, refreshShopStatusMock, printMock } = vi.hoisted(() => ({ navigateToMock: vi.fn(), refreshShopStatusMock: vi.fn(), printMock: vi.fn() }))
mockNuxtImport('navigateTo', () => navigateToMock)
mockNuxtImport('usePrint', () => () => ({ print: printMock }))
mockNuxtImport('useShopStatus', () => () => ({ status: { value: 'approved' }, refresh: refreshShopStatusMock, approveForTesting: null }))

const phones = EXAMPLE_IDS.phones
const gymSession: MerchantSession = { ...barbershopSession, shopId: EXAMPLE_IDS.shops.gym, shopName: 'Academia Movimento' }
const pizzeriaSession: MerchantSession = { ...barbershopSession, shopId: EXAMPLE_IDS.shops.pizzeria, shopName: 'Pizzaria Forno a Lenha' }

function t(key: string, named?: Record<string, unknown>, plural?: number): string {
  return useNuxtApp().$i18n.t(key, named ?? {}, plural ?? 1)
}

/** Nenhum campo de um pedido de foco carrega dado digitado: só o alvo e o id. */
function expectFocusRequestWithoutPhone(request: unknown): void {
  expect(request).not.toBeNull()
  expect(Object.keys(request as object).sort()).toEqual(['id', 'target'])
  expect(JSON.stringify(request)).not.toMatch(/\d{8,}/)
}

beforeEach(() => {
  resetWorld({ merchant: barbershopSession })
  navigateToMock.mockReset()
  refreshShopStatusMock.mockReset()
  printMock.mockReset()
})

afterEach(() => {
  restoreClock()
})

const MS_PER_MINUTE = 60_000

/** O QR conta o tempo e consulta o servidor por intervalo: só os intervalos e o relógio ficam falsos. */
function fakeClock(): void {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
  vi.setSystemTime(TEST_NOW)
}

async function customerScans(code: string, customerId = EXAMPLE_IDS.customers.joao): Promise<void> {
  const claimed = await useNuxtApp().$mockBackend.run((ctx) =>
    claimVisitQr(ctx, customerId, { kind: 'visitCode', code: VisitCodeSchema.parse(code) }),
  )
  if (!claimed.ok) throw new Error(claimed.error.code)
}

describe('useCounterScreen', () => {
  it('asks to focus the issue button once the program is loaded, with only a target and an id', async () => {
    const { result } = await mountComposable(useCounterScreen)
    expect(result.focusRequest).toEqual({ target: 'issueVisitQr', id: 1 })
    expectFocusRequestWithoutPhone(result.focusRequest)
  })

  it('exposes the long date of today', async () => {
    const { result } = await mountComposable(useCounterScreen)
    expect(result.today).toBe('quinta-feira, 1 de outubro')
  })

  it('derives a visit action and the plain issue label from a stamp program', async () => {
    const { result } = await mountComposable(useCounterScreen)
    expect(result.visitQr.action).toEqual({ kind: 'visit', unit: 'stamp', units: 1 })
    expect(result.visitQr.issueLabel).toBe(t('counter.visitQr.issue'))
    expect(result.visitQr.programFailed).toBe(false)
    expect(result.visitQr.display).toBeNull()
  })

  it('loads the ledger of the day with masked phones only', async () => {
    const { result } = await mountComposable(useCounterScreen)
    expect(result.ledger.status).toBe('success')
    expect(result.ledger.rows).toHaveLength(3)
    for (const row of result.ledger.rows) {
      expect(row.phone).toMatch(/^\(\d{2}\) 9••••-\d{4}$/)
      expect(row.fresh).toBe(false)
    }
  })

  it('issues a QR: shows it active with the code to type and the five-minute countdown, never the phone', async () => {
    const { result } = await mountComposable(useCounterScreen)
    await result.visitQr.issue()
    await flushPromises()
    expect(result.visitQr.display).toMatchObject({
      status: 'active',
      statusLabel: t('counter.visitQr.status.active'),
      countdown: t('counter.visitQr.expiresIn', { time: `${VISIT_QR_TTL_MINUTES}:00` }),
      refusal: null,
      receipt: null,
    })
    expect(result.visitQr.display?.visitCode).toMatch(/^[A-Z0-9]{5}$/)
    expect(result.visitQr.display?.qr.d.length).toBeGreaterThan(0)
    expect(result.ledger.rows).toHaveLength(3)
  })

  it('simulates the use: the receipt shows the masked phone, the ledger gets a fresh row and the focus goes to "issue another"', async () => {
    const { result } = await mountComposable(useCounterScreen)
    expect(result.visitQr.canSimulate).toBe(true)
    await result.visitQr.issue()
    await result.visitQr.simulateClaim()
    await flushPromises()
    expect(result.visitQr.display?.status).toBe('claimed')
    expect(result.visitQr.display?.receipt?.model.title).toMatch(/\(67\) 9••••-\d{4}/)
    expect(result.ledger.rows).toHaveLength(4)
    expect(result.ledger.rows[0]).toMatchObject({ fresh: true })
    expect(result.focusRequest).toEqual({ target: 'issueVisitQr', id: 2 })
    expectFocusRequestWithoutPhone(result.focusRequest)
    expect(JSON.stringify(result.visitQr.display)).not.toMatch(/\d{10,}/)
  })

  it('CA-22: polls the server and turns the QR into "used" and a ledger row when the customer scans', async () => {
    fakeClock()
    const { result } = await mountComposable(useCounterScreen)
    await result.visitQr.issue()
    await flushPromises()
    const code = result.visitQr.display?.visitCode ?? ''
    await customerScans(code)
    expect(result.visitQr.display?.status).toBe('active')
    await vi.advanceTimersByTimeAsync(VISIT_QR_STATUS_POLL_MS)
    await flushPromises()
    expect(result.visitQr.display?.status).toBe('claimed')
    expect(result.visitQr.display?.receipt?.model.title).toContain('(67) 9••••-0002')
    expect(result.ledger.rows).toHaveLength(4)
    expect(result.ledger.rows[0]).toMatchObject({ phone: '(67) 9••••-0002', fresh: true })
    expect(result.focusRequest).toEqual({ target: 'issueVisitQr', id: 2 })
  })

  it('counts down every second and asks for the focus on "issue another" once the QR expires (CA-23)', async () => {
    fakeClock()
    const { result } = await mountComposable(useCounterScreen)
    await result.visitQr.issue()
    await flushPromises()
    await vi.advanceTimersByTimeAsync(1000)
    expect(result.visitQr.display?.countdown).toBe(t('counter.visitQr.expiresIn', { time: '4:59' }))
    await vi.advanceTimersByTimeAsync(VISIT_QR_TTL_MINUTES * MS_PER_MINUTE)
    await flushPromises()
    expect(result.visitQr.display).toMatchObject({ status: 'expired', countdown: null, statusLabel: t('counter.visitQr.status.expired') })
    expect(result.focusRequest).toEqual({ target: 'issueVisitQr', id: 2 })
  })

  it('cancels the QR and offers another', async () => {
    const { result } = await mountComposable(useCounterScreen)
    await result.visitQr.issue()
    await result.visitQr.cancel()
    await flushPromises()
    expect(result.visitQr.display?.status).toBe('cancelled')
    expect(result.focusRequest).toEqual({ target: 'issueVisitQr', id: 2 })
  })

  it('goes back to the form and focuses the issue button on "issue another"', async () => {
    const { result } = await mountComposable(useCounterScreen)
    await result.visitQr.issue()
    await result.visitQr.cancel()
    await result.visitQr.issueAnother()
    await flushPromises()
    expect(result.visitQr.display).toBeNull()
    expect(result.focusRequest).toEqual({ target: 'issueVisitQr', id: 3 })
  })

  it('prints through the print composable', async () => {
    const { result } = await mountComposable(useCounterScreen)
    result.visitQr.print()
    expect(printMock).toHaveBeenCalledTimes(1)
  })

  it('reports a non-field error as an alert code, without refocusing', async () => {
    resetWorld({ merchant: gymSession })
    const { result } = await mountComposable(useCounterScreen)
    await result.visitQr.issue()
    expect(result.visitQr.alertCode).toBe('shopPendingApproval')
    expect(result.visitQr.amountErrorCode).toBeNull()
    expect(result.visitQr.display).toBeNull()
    expect(result.focusRequest).toEqual({ target: 'issueVisitQr', id: 1 })
  })

  it('refreshes the shop status when the shop is still pending approval (session guard on)', async () => {
    resetWorld({ merchant: gymSession })
    const { result } = await mountComposable(useCounterScreen)
    await result.visitQr.issue()
    await vi.waitFor(() => expect(refreshShopStatusMock).toHaveBeenCalled())
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('signs the merchant out when a service answers unauthorized (session guard on)', async () => {
    const { result } = await mountComposable(useCounterScreen)
    useMerchantSessionStore().endMerchant()
    await result.visitQr.issue()
    await vi.waitFor(() => expect(navigateToMock).toHaveBeenCalledWith('/balcao/entrar', { replace: true }))
  })

  it('flags a program and a ledger that failed to load', async () => {
    useMerchantSessionStore().endMerchant()
    const { result } = await mountComposable(useCounterScreen)
    expect(result.visitQr.programFailed).toBe(true)
    expect(result.visitQr.action).toBeNull()
    expect(result.ledger.status).toBe('error')
    expect(result.ledger.errorCode).toBe('unauthorized')
    await result.visitQr.issue()
    expect(result.visitQr.display).toBeNull()
  })

  describe('in points per real', () => {
    beforeEach(() => {
      resetWorld({ merchant: cafeSession })
    })

    it('focuses the amount first and shows the rate', async () => {
      const { result } = await mountComposable(useCounterScreen)
      expect(result.visitQr.action).toEqual({ kind: 'amount', pointsPerReal: 1 })
      expect(result.focusRequest).toEqual({ target: 'amount', id: 1 })
      expect(result.visitQr.amountHint).toBeTruthy()
    })

    it('CA-09: types the amount, previews the points and issues a QR pinned to it, clearing the amount', async () => {
      const { result } = await mountComposable(useCounterScreen)
      result.visitQr.inputAmount('R$ 25,00')
      expect(result.visitQr.amountText.replace(/\s/g, ' ')).toBe('R$ 25,00')
      expect(result.visitQr.issueLabel).toContain('25,00')
      expect(result.visitQr.amountPreview).toContain('25')
      await result.visitQr.issue()
      await flushPromises()
      expect(result.visitQr.display?.status).toBe('active')
      expect(result.visitQr.amountText).toBe('')
      await result.visitQr.simulateClaim()
      await flushPromises()
      expect(result.ledger.rows[0]).toMatchObject({ fresh: true })
      expect(result.ledger.rows[0]?.action).toContain('25,00')
    })

    it('asks for the amount when it is missing, on the field, and focuses it', async () => {
      const { result } = await mountComposable(useCounterScreen)
      await result.visitQr.issue()
      expect(result.visitQr.amountErrorCode).toBe('invalidAmount')
      expect(result.visitQr.alertCode).toBeNull()
      expect(result.visitQr.display).toBeNull()
      expect(result.focusRequest).toEqual({ target: 'amount', id: 2 })
      result.visitQr.inputAmount('2500')
      expect(result.visitQr.amountErrorCode).toBeNull()
    })

    it('focuses the amount again on "issue another"', async () => {
      const { result } = await mountComposable(useCounterScreen)
      result.visitQr.inputAmount('2500')
      await result.visitQr.issue()
      await result.visitQr.cancel()
      await result.visitQr.issueAnother()
      expect(result.focusRequest).toMatchObject({ target: 'amount' })
      expect(result.visitQr.display).toBeNull()
    })
  })

  describe('with a redemption', () => {
    beforeEach(() => {
      resetWorld({ merchant: pizzeriaSession })
    })

    async function requestPizzeriaCode(): Promise<string> {
      useSessionStore().startCustomer(anaSession)
      const { $customerServices } = useNuxtApp()
      const card = await $customerServices.wallet.getCard(EXAMPLE_IDS.shops.pizzeria)
      if (!card.ok) throw new Error(card.error.code)
      const redemption = await $customerServices.redemption.requestCode(card.value.id)
      if (!redemption.ok) throw new Error(redemption.error.code)
      return redemption.value.code
    }

    it('previews the redemption with the masked phone, then delivers and logs it in the ledger', async () => {
      const code = await requestPizzeriaCode()
      const { result } = await mountComposable(useCounterScreen)
      result.redemption.code = [...code]
      await result.redemption.complete()
      expect(result.redemption.status).toBe('preview')
      expect(result.redemption.preview?.rewardTitle).toBe('Pizza média')
      expect(result.redemption.preview?.customerLine).toContain('(67) 9••••-0001')
      expect(JSON.stringify(result.redemption.preview)).not.toContain(phones.ana)

      await result.redemption.deliver()
      await flushPromises()
      expect(result.redemption.status).toBe('delivered')
      expect(result.redemption.deliveredReward).toBe('Pizza média')
      expect(result.redemption.preview).toBeNull()
      expect(result.ledger.rows[0]).toMatchObject({ tone: 'reward', fresh: true })
    })

    it('rejects a malformed code, clears the cells and asks to focus the code stub', async () => {
      const { result } = await mountComposable(useCounterScreen)
      result.redemption.code = ['A', 'B']
      await result.redemption.complete()
      expect(result.redemption.status).toBe('error')
      expect(result.redemption.errorCode).toBe('redemptionInvalid')
      expect(result.redemption.code).toEqual([])
      expect(result.focusRequest).toEqual({ target: 'redemptionCode', id: 2 })
    })

    it('rejects a well-formed code that does not exist', async () => {
      const { result } = await mountComposable(useCounterScreen)
      result.redemption.code = [...'ACDEFG']
      await result.redemption.complete()
      expect(result.redemption.errorCode).toBe('redemptionInvalid')
      expect(result.focusRequest).toEqual({ target: 'redemptionCode', id: 2 })
    })

    it('cancels a preview, clears the cells and asks to focus the stub', async () => {
      const code = await requestPizzeriaCode()
      const { result } = await mountComposable(useCounterScreen)
      result.redemption.code = [...code]
      await result.redemption.complete()
      result.redemption.cancel()
      expect(result.redemption.status).toBe('idle')
      expect(result.redemption.code).toEqual([])
      expect(result.focusRequest).toEqual({ target: 'redemptionCode', id: 2 })
    })
  })
})

function fakeProgram(rules: Program['rules'] | 'error'): AsyncResult<Program, TransportError> {
  const program = ProgramSchema.parse({
    id: 'prog_cafe',
    shopId: EXAMPLE_IDS.shops.cafe,
    reward: { title: 'Café com pão de queijo' },
    rules: rules === 'error' ? { mode: 'stamps', target: 10 } : rules,
    bonusRules: {
      welcomeBonus: { enabled: false, units: 2 },
      birthdayMultiplier: { enabled: true, multiplier: 2 },
      referralBonus: { enabled: false, units: 1 },
      surpriseDay: { enabled: false, multiplier: 2, date: null },
    },
    checkIn: { enabled: true, cooldownHours: 4, cooldownMode: 'rolling' },
    expirationPolicy: { kind: 'never' },
  })
  const state: AsyncResultState<Program, TransportError> =
    rules === 'error' ? { status: 'error', error: { code: 'network' } } : { status: 'success', value: program }
  return { state: computed(() => state), reload: vi.fn(() => Promise.resolve()), set: vi.fn() }
}

const fakeLedger = (): CounterLedger => ({
  state: computed(() => ({ status: 'success', value: [] })),
  truncated: ref(false),
  freshIds: ref(new Set<string>()),
  reload: vi.fn(() => Promise.resolve()),
  prepend: vi.fn(),
})

const perReal = (pointsPerReal: number): Program['rules'] => ({ mode: 'pointsPerCurrency', pointsPerReal, target: 150 })

const TOKEN = VisitTokenSchema.parse('Zk3_-'.repeat(8) + 'abc')

function visitQrOf(overrides: Partial<Record<keyof VisitQr, unknown>> = {}): VisitQr {
  return VisitQrSchema.parse({
    id: 'vqr_1',
    visitCode: 'K7M2Q',
    status: 'active',
    earn: { kind: 'visit' },
    createdAt: '2026-10-01T16:00:00.000Z',
    expiresAt: '2026-10-01T16:05:00.000Z',
    claim: null,
    refusal: null,
    ...overrides,
  })
}

describe('useVisitQrPanel', () => {
  function fakeControl(initial: VisitQrState = { status: 'idle' }): VisitQrControl & { state: Ref<VisitQrState>; remaining: Ref<number> } {
    return {
      amount: ref(''),
      state: shallowRef(initial),
      remaining: ref(252),
      issue: vi.fn(() => Promise.resolve()),
      cancel: vi.fn(() => Promise.resolve()),
      reset: vi.fn(),
      simulateClaim: null,
    }
  }

  it('focuses the amount in the amount mode and the issue button otherwise, once', async () => {
    const perRealFocus = vi.fn()
    await mountComposable(() => useVisitQrPanel(fakeProgram(perReal(1)), fakeControl(), fakeLedger(), perRealFocus))
    expect(perRealFocus).toHaveBeenCalledExactlyOnceWith('amount')
    const visitFocus = vi.fn()
    await mountComposable(() => useVisitQrPanel(fakeProgram({ mode: 'stamps', target: 10 }), fakeControl(), fakeLedger(), visitFocus))
    expect(visitFocus).toHaveBeenCalledExactlyOnceWith('issueVisitQr')
  })

  it('keeps only digits when the amount is typed and shows no text for an empty amount', async () => {
    const control = fakeControl()
    const { result } = await mountComposable(() => useVisitQrPanel(fakeProgram(perReal(2)), control, fakeLedger(), vi.fn()))
    expect(result.amountText).toBe('')
    result.inputAmount('R$ 0,24a9')
    expect(control.amount.value).toBe('249')
    expect(result.amountText.replace(/\s/g, ' ')).toBe('R$ 2,49')
    result.inputAmount(1500)
    expect(control.amount.value).toBe('1500')
    expect(result.amountHint).toBeTruthy()
    expect(control.reset).not.toHaveBeenCalled()
  })

  it('clears an earlier error when the amount is typed again', async () => {
    const control = fakeControl({ status: 'error', code: 'invalidAmount' })
    const { result } = await mountComposable(() => useVisitQrPanel(fakeProgram(perReal(1)), control, fakeLedger(), vi.fn()))
    result.inputAmount('2')
    expect(control.reset).toHaveBeenCalledTimes(1)
    expect(control.amount.value).toBe('2')
  })

  it('does nothing when the program is not loaded', async () => {
    const control = fakeControl()
    const focus = vi.fn()
    const { result } = await mountComposable(() => useVisitQrPanel(fakeProgram('error'), control, fakeLedger(), focus))
    expect(result.programFailed).toBe(true)
    expect(result.action).toBeNull()
    await result.issue()
    expect(control.issue).not.toHaveBeenCalled()
    expect(focus).not.toHaveBeenCalled()
  })

  it('splits error codes between the amount field and the alert, and flags the pending issue', async () => {
    const control = fakeControl({ status: 'error', code: 'invalidAmount' })
    const { result } = await mountComposable(() => useVisitQrPanel(fakeProgram(perReal(1)), control, fakeLedger(), vi.fn()))
    expect(result).toMatchObject({ amountErrorCode: 'invalidAmount', alertCode: null })
    control.state.value = { status: 'error', code: 'unauthorized' }
    expect(result).toMatchObject({ amountErrorCode: null, alertCode: 'unauthorized' })
    control.state.value = { status: 'issuing' }
    expect(result.pending).toBe(true)
    expect(result.alertCode).toBeNull()
  })

  it('focuses the amount when the issue came back with an invalid amount', async () => {
    const control = fakeControl()
    vi.mocked(control.issue).mockImplementationOnce(() => {
      control.state.value = { status: 'error', code: 'invalidAmount' }
      return Promise.resolve()
    })
    const focus = vi.fn()
    const { result } = await mountComposable(() => useVisitQrPanel(fakeProgram(perReal(1)), control, fakeLedger(), focus))
    focus.mockClear()
    await result.issue()
    expect(control.issue).toHaveBeenCalledWith({ kind: 'amount', pointsPerReal: 1 })
    expect(focus).toHaveBeenCalledWith('amount')
  })

  it('shows the QR from the token held in memory and never leaks the token into the model', async () => {
    const control = fakeControl({ status: 'showing', qr: visitQrOf(), token: TOKEN, skewMs: 0 })
    const { result } = await mountComposable(() => useVisitQrPanel(fakeProgram({ mode: 'stamps', target: 10 }), control, fakeLedger(), vi.fn()))
    expect(result.display).toMatchObject({ status: 'active', visitCode: 'K7M2Q', countdown: t('counter.visitQr.expiresIn', { time: '4:12' }) })
    expect(JSON.stringify(result.display)).not.toContain(TOKEN)
    control.remaining.value = 251
    expect(result.display?.countdown).toBe(t('counter.visitQr.expiresIn', { time: '4:11' }))
    control.state.value = { status: 'idle' }
    expect(result.display).toBeNull()
  })

  it('prepends the claim entry to the ledger and asks to focus "issue another" when the QR is used', async () => {
    const control = fakeControl({ status: 'showing', qr: visitQrOf(), token: TOKEN, skewMs: 0 })
    const ledger = fakeLedger()
    const focus = vi.fn()
    await mountComposable(() => useVisitQrPanel(fakeProgram({ mode: 'stamps', target: 10 }), control, ledger, focus))
    focus.mockClear()
    const claim = {
      entry: { id: 'visit_9', shopId: 'shop_barbearia', maskedPhone: '(67) 9••••-0002', kind: 'visit', unit: 'stamp', units: 1, amountCents: null, rewardTitle: null, isNewCustomer: false, createdAt: '2026-10-01T16:01:00.000Z' },
      card: { cardId: 'card_1', unit: 'stamp', balance: 4, target: 10, rewardReady: false },
      unitsEarned: 1,
      welcomeUnits: 0,
    }
    control.state.value = { status: 'showing', qr: visitQrOf({ status: 'claimed', claim }), token: TOKEN, skewMs: 0 }
    await flushPromises()
    expect(ledger.prepend).toHaveBeenCalledTimes(1)
    expect(ledger.prepend).toHaveBeenCalledWith(expect.objectContaining({ id: 'visit_9' }))
    expect(focus).toHaveBeenCalledExactlyOnceWith('issueVisitQr')
  })

  it('exposes the test simulation only when the control has one', async () => {
    const control = fakeControl()
    const { result } = await mountComposable(() => useVisitQrPanel(fakeProgram({ mode: 'stamps', target: 10 }), control, fakeLedger(), vi.fn()))
    expect(result.canSimulate).toBe(false)
    const simulate = vi.fn(() => Promise.resolve())
    const withSimulation = { ...fakeControl(), simulateClaim: simulate }
    const other = await mountComposable(() => useVisitQrPanel(fakeProgram({ mode: 'stamps', target: 10 }), withSimulation, fakeLedger(), vi.fn()))
    expect(other.result.canSimulate).toBe(true)
    await other.result.simulateClaim()
    expect(simulate).toHaveBeenCalledTimes(1)
  })
})

describe('useVisitQr', () => {
  function visitQrService() {
    return useNuxtApp().$merchantServices.visitQr
  }

  it('issues the QR and keeps the token in memory only, with the full life left', async () => {
    const { result } = await mountComposable(useVisitQr)
    expect(result.state.value).toEqual({ status: 'idle' })
    expect(result.remaining.value).toBe(0)
    await result.issue({ kind: 'visit', unit: 'stamp', units: 1 })
    const state = result.state.value
    if (state.status !== 'showing') throw new Error(`expected showing, got ${state.status}`)
    expect(state.token).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(state.qr).toMatchObject({ status: 'active', earn: { kind: 'visit' } })
    expect(Object.keys(state.qr)).not.toContain('token')
    expect(result.remaining.value).toBe(VISIT_QR_TTL_MINUTES * 60)
  })

  it('does not call the service for a missing amount in the amount mode', async () => {
    resetWorld({ merchant: cafeSession })
    const issue = vi.spyOn(visitQrService(), 'issueVisitQr')
    const { result } = await mountComposable(useVisitQr)
    await result.issue({ kind: 'amount', pointsPerReal: 1 })
    expect(result.state.value).toEqual({ status: 'error', code: 'invalidAmount' })
    expect(issue).not.toHaveBeenCalled()
    result.amount.value = '2500'
    await result.issue({ kind: 'amount', pointsPerReal: 1 })
    expect(issue).toHaveBeenCalledWith({ amountCents: 2500 })
    expect(result.amount.value).toBe('')
    issue.mockRestore()
  })

  it('refuses a second issue while one is in flight', async () => {
    const issue = vi.spyOn(visitQrService(), 'issueVisitQr')
    const { result } = await mountComposable(useVisitQr)
    const action = { kind: 'visit', unit: 'stamp', units: 1 } as const
    await Promise.all([result.issue(action), result.issue(action)])
    expect(issue).toHaveBeenCalledTimes(1)
    issue.mockRestore()
  })

  it('counts down by the second and polls every three seconds while waiting for the customer', async () => {
    fakeClock()
    const lookup = vi.spyOn(visitQrService(), 'getVisitQr')
    const { result } = await mountComposable(useVisitQr)
    await result.issue({ kind: 'visit', unit: 'stamp', units: 1 })
    await vi.advanceTimersByTimeAsync(2000)
    expect(result.remaining.value).toBe(298)
    expect(lookup).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(VISIT_QR_STATUS_POLL_MS * 2)
    expect(lookup).toHaveBeenCalledTimes(2)
    lookup.mockRestore()
  })

  it('stops polling once the QR is not waiting anymore and when the screen goes away', async () => {
    fakeClock()
    const lookup = vi.spyOn(visitQrService(), 'getVisitQr')
    const { result, wrapper } = await mountComposable(useVisitQr)
    await result.issue({ kind: 'visit', unit: 'stamp', units: 1 })
    await result.cancel()
    await vi.advanceTimersByTimeAsync(VISIT_QR_STATUS_POLL_MS * 3)
    expect(lookup).not.toHaveBeenCalled()

    await result.issue({ kind: 'visit', unit: 'stamp', units: 1 })
    wrapper.unmount()
    await vi.advanceTimersByTimeAsync(VISIT_QR_STATUS_POLL_MS * 3)
    expect(lookup).not.toHaveBeenCalled()
    lookup.mockRestore()
  })

  it('keeps the QR on screen when a poll fails in passing, and drops it when the session is gone', async () => {
    fakeClock()
    const lookup = vi.spyOn(visitQrService(), 'getVisitQr')
    const { result } = await mountComposable(useVisitQr)
    await result.issue({ kind: 'visit', unit: 'stamp', units: 1 })
    lookup.mockResolvedValueOnce({ ok: false, error: { code: 'network' } })
    await vi.advanceTimersByTimeAsync(VISIT_QR_STATUS_POLL_MS)
    expect(result.state.value.status).toBe('showing')
    lookup.mockResolvedValueOnce({ ok: false, error: { code: 'unauthorized' } })
    await vi.advanceTimersByTimeAsync(VISIT_QR_STATUS_POLL_MS)
    expect(result.state.value).toEqual({ status: 'error', code: 'unauthorized' })
    lookup.mockRestore()
  })

  it('ignores a lookup that answers after the QR was replaced', async () => {
    fakeClock()
    const lookup = vi.spyOn(visitQrService(), 'getVisitQr')
    const { result } = await mountComposable(useVisitQr)
    await result.issue({ kind: 'visit', unit: 'stamp', units: 1 })
    const current = result.state.value
    if (current.status !== 'showing') throw new Error('expected showing')
    let answer: (value: Awaited<ReturnType<typeof lookup>>) => void = () => undefined
    lookup.mockReturnValueOnce(new Promise((resolve) => { answer = resolve }))
    await vi.advanceTimersByTimeAsync(VISIT_QR_STATUS_POLL_MS)
    result.reset()
    answer({ ok: true, value: { ...current.qr, status: 'claimed' } })
    await flushPromises()
    expect(result.state.value).toEqual({ status: 'idle' })
    lookup.mockRestore()
  })

  it('asks the server when the countdown reaches zero, and the server has the last word', async () => {
    fakeClock()
    const { result } = await mountComposable(useVisitQr)
    await result.issue({ kind: 'visit', unit: 'stamp', units: 1 })
    await vi.advanceTimersByTimeAsync(VISIT_QR_TTL_MINUTES * MS_PER_MINUTE)
    await flushPromises()
    expect(result.remaining.value).toBe(0)
    expect(result.state.value).toMatchObject({ status: 'showing', qr: { status: 'expired' } })
  })

  it('measures the server clock difference at the issue and counts the time by the server clock', async () => {
    fakeClock()
    const issue = vi.spyOn(visitQrService(), 'issueVisitQr')
    const serverNow = Date.now() + 30_000
    const issued = visitQrOf({
      createdAt: new Date(serverNow).toISOString(),
      expiresAt: new Date(serverNow + VISIT_QR_TTL_MINUTES * MS_PER_MINUTE).toISOString(),
    })
    issue.mockResolvedValueOnce({ ok: true, value: { ...issued, token: TOKEN } })
    const { result } = await mountComposable(useVisitQr)
    await result.issue({ kind: 'visit', unit: 'stamp', units: 1 })
    expect(result.remaining.value).toBe(VISIT_QR_TTL_MINUTES * 60)
    await vi.advanceTimersByTimeAsync(1000)
    expect(result.remaining.value).toBe(VISIT_QR_TTL_MINUTES * 60 - 1)
    issue.mockRestore()
  })

  it('simulates the claim only in the mock, and the result turns the QR into used', async () => {
    const { result } = await mountComposable(useVisitQr)
    expect(result.simulateClaim).not.toBeNull()
    await result.issue({ kind: 'visit', unit: 'stamp', units: 1 })
    await result.simulateClaim?.()
    expect(result.state.value).toMatchObject({ status: 'showing', qr: { status: 'claimed' } })
  })
})

describe('useCounterRedemptionView', () => {
  const preview = RedemptionPreviewSchema.parse({
    redemptionId: 'red_1',
    rewardTitle: 'Pizza média',
    maskedPhone: '(67) 9••••-0001',
    expiresAt: '2026-10-01T17:32:00.000Z',
  })

  function fakeCheck(initial: RedemptionCheckState): RedemptionCheck & { state: Ref<RedemptionCheckState> } {
    return {
      code: ref<string[]>([]),
      state: shallowRef(initial),
      validate: vi.fn(() => Promise.resolve()),
      confirm: vi.fn(() => Promise.resolve(null)),
      reset: vi.fn(),
    }
  }

  const ledgerStub = (): CounterLedger => ({
    state: computed(() => ({ status: 'loading' })),
    truncated: ref(false),
    freshIds: ref(new Set<string>()),
    reload: vi.fn(() => Promise.resolve()),
    prepend: vi.fn(),
  })

  it('shows the preview while checking the delivery and hides it otherwise', async () => {
    const check = fakeCheck({ status: 'preview', preview })
    const { result } = await mountComposable(() => useCounterRedemptionView(check, ledgerStub(), vi.fn()))
    expect(result.preview).toMatchObject({ rewardTitle: 'Pizza média', confirming: false })
    check.state.value = { status: 'confirming', preview }
    expect(result.preview?.confirming).toBe(true)
    check.state.value = { status: 'delivered', rewardTitle: 'Pizza média' }
    expect(result.preview).toBeNull()
    expect(result.deliveredReward).toBe('Pizza média')
    check.state.value = { status: 'idle' }
    expect(result.deliveredReward).toBeNull()
  })

  it('only focuses the code cells after a validation that ended in error', async () => {
    const check = fakeCheck({ status: 'idle' })
    const focus = vi.fn()
    const { result } = await mountComposable(() => useCounterRedemptionView(check, ledgerStub(), focus))
    await result.complete()
    expect(focus).not.toHaveBeenCalled()
    vi.mocked(check.validate).mockImplementationOnce(() => {
      check.state.value = { status: 'error', code: 'redemptionExpired' }
      return Promise.resolve()
    })
    await result.complete()
    expect(result.errorCode).toBe('redemptionExpired')
    expect(focus).toHaveBeenCalledWith('redemptionCode')
  })

  it('prepends the delivered entry to the ledger, and nothing when the delivery failed', async () => {
    const check = fakeCheck({ status: 'preview', preview })
    const ledger = ledgerStub()
    const entry: CounterEntry = CounterEntrySchema.parse({
      id: 'visit_9',
      shopId: 'shop_pizzaria',
      maskedPhone: '(67) 9••••-0001',
      kind: 'redemption',
      unit: 'stamp',
      units: 8,
      amountCents: null,
      rewardTitle: 'Pizza média',
      isNewCustomer: false,
      createdAt: '2026-10-01T17:32:00.000Z',
    })
    const { result } = await mountComposable(() => useCounterRedemptionView(check, ledger, vi.fn()))
    await result.deliver()
    expect(ledger.prepend).not.toHaveBeenCalled()
    vi.mocked(check.confirm).mockResolvedValueOnce(entry)
    await result.deliver()
    expect(ledger.prepend).toHaveBeenCalledWith(entry)
  })
})

describe('useCounterLedgerView', () => {
  it('lists rows with a fresh flag and exposes the transport error code', async () => {
    const entry = CounterEntrySchema.parse({
      id: 'visit_1',
      shopId: 'shop_barbearia',
      maskedPhone: '(67) 9••••-0374',
      kind: 'visit',
      unit: 'stamp',
      units: 1,
      amountCents: null,
      rewardTitle: null,
      isNewCustomer: true,
      createdAt: '2026-10-01T17:32:00.000Z',
    })
    const state = shallowRef<AsyncResultState<CounterEntry[], TransportError>>({ status: 'loading' })
    const reload = vi.fn(() => Promise.resolve())
    const ledger: CounterLedger = { state: computed(() => state.value), truncated: ref(true), freshIds: ref(new Set(['visit_1'])), reload, prepend: vi.fn() }
    const { result } = await mountComposable(() => useCounterLedgerView(ledger))
    expect(result).toMatchObject({ status: 'loading', errorCode: null, rows: [], truncated: true })

    state.value = { status: 'success', value: [entry] }
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0]).toMatchObject({ id: 'visit_1', phone: '(67) 9••••-0374', fresh: true, badge: t('counter.ledger.newCustomer') })

    state.value = { status: 'error', error: { code: 'network' } }
    expect(result).toMatchObject({ status: 'error', errorCode: 'network', rows: [] })
    await result.reload()
    expect(reload).toHaveBeenCalled()
  })
})
