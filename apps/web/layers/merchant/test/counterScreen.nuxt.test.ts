import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { computed, ref, shallowRef } from 'vue'
import type { Ref } from 'vue'
import { useNuxtApp } from '#imports'
import { EXAMPLE_IDS } from '#layers/core/app/mock'
import { useSessionStore } from '#layers/core/app/stores/session'
import { anaSession, barbershopSession } from '#layers/core/test/fixtures'
import { mountComposable } from '#layers/core/test/composableHarness.nuxt'
import { resetWorld, restoreClock } from '#layers/core/test/pageHarness.nuxt'
import type { AsyncResult, AsyncResultState } from '#layers/core/app/types/asyncResult'
import { ProgramSchema } from '#shared/schemas/program'
import type { Program } from '#shared/schemas/program'
import { CounterEntrySchema } from '#shared/schemas/visit'
import type { CounterEntry } from '#shared/schemas/visit'
import { RedemptionPreviewSchema } from '#shared/schemas/redemption'
import type { MerchantSession } from '#shared/schemas/session'
import type { TransportError } from '#shared/types/errors'
import { useCounterLaunchForm } from '../app/composables/useCounterLaunchForm'
import { useCounterLedgerView } from '../app/composables/useCounterLedgerView'
import { useCounterRedemptionView } from '../app/composables/useCounterRedemptionView'
import { useCounterScreen } from '../app/composables/useCounterScreen'
import type { CounterLaunch, CounterLaunchState, CounterLedger, RedemptionCheck, RedemptionCheckState } from '../app/types/counter'

const { navigateToMock, refreshShopStatusMock } = vi.hoisted(() => ({ navigateToMock: vi.fn(), refreshShopStatusMock: vi.fn() }))
mockNuxtImport('navigateTo', () => navigateToMock)
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
})

afterEach(() => {
  restoreClock()
})

describe('useCounterScreen', () => {
  it('asks to focus the phone field once mounted, with only a target and an id', async () => {
    const { result } = await mountComposable(useCounterScreen)
    expect(result.focusRequest).toEqual({ target: 'phone', id: 1 })
    expectFocusRequestWithoutPhone(result.focusRequest)
  })

  it('exposes the long date of today', async () => {
    const { result } = await mountComposable(useCounterScreen)
    expect(result.today).toBe('quinta-feira, 1 de outubro')
  })

  it('derives a one-stamp action and its label from a stamp program', async () => {
    const { result } = await mountComposable(useCounterScreen)
    expect(result.launch.action).toEqual({ kind: 'visit', unit: 'stamp', units: 1 })
    expect(result.launch.programFailed).toBe(false)
    expect(result.launch.submitLabel).toContain('1')
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

  it('launches a visit: clears the phone, prepends a fresh masked row and asks to focus the phone again', async () => {
    const { result } = await mountComposable(useCounterScreen)
    result.launch.phone = phones.joao
    await result.launch.submit()
    await flushPromises()
    expect(result.launch.phone).toBe('')
    expect(result.launch.receipt?.model.title).toContain('(67) 9••••-0002')
    expect(result.ledger.rows).toHaveLength(4)
    expect(result.ledger.rows[0]).toMatchObject({ phone: '(67) 9••••-0002', fresh: true })
    expect(result.focusRequest).toEqual({ target: 'phone', id: 2 })
    expectFocusRequestWithoutPhone(result.focusRequest)
    expect(JSON.stringify(result.ledger.rows)).not.toContain(phones.joao)
    expect(JSON.stringify(result.launch.receipt)).not.toContain(phones.joao)
  })

  it('shows a field error code for a short phone and refocuses the phone', async () => {
    const { result } = await mountComposable(useCounterScreen)
    result.launch.phone = '679'
    await flushPromises()
    await result.launch.submit()
    expect(result.launch.phoneErrorCode).toBe('invalidPhone')
    expect(result.launch.alertCode).toBeNull()
    expect(result.launch.receipt).toBeNull()
    expect(result.focusRequest).toEqual({ target: 'phone', id: 2 })
  })

  it('reports a non-field error as an alert code, without refocusing', async () => {
    resetWorld({ merchant: gymSession })
    const { result } = await mountComposable(useCounterScreen)
    result.launch.phone = phones.joao
    await result.launch.submit()
    expect(result.launch.alertCode).toBe('shopPendingApproval')
    expect(result.launch.phoneErrorCode).toBeNull()
    expect(result.focusRequest).toEqual({ target: 'phone', id: 1 })
  })

  it('refreshes the shop status when the shop is still pending approval (session guard on)', async () => {
    resetWorld({ merchant: gymSession })
    const { result } = await mountComposable(useCounterScreen)
    result.launch.phone = phones.joao
    await result.launch.submit()
    await vi.waitFor(() => expect(refreshShopStatusMock).toHaveBeenCalled())
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('signs the merchant out when a service answers unauthorized (session guard on)', async () => {
    const { result } = await mountComposable(useCounterScreen)
    useSessionStore().endMerchant()
    result.launch.phone = phones.joao
    await result.launch.submit()
    await vi.waitFor(() => expect(navigateToMock).toHaveBeenCalledWith('/balcao/entrar', { replace: true }))
  })

  it('flags a program and a ledger that failed to load', async () => {
    useSessionStore().endMerchant()
    const { result } = await mountComposable(useCounterScreen)
    expect(result.launch.programFailed).toBe(true)
    expect(result.launch.action).toBeNull()
    expect(result.ledger.status).toBe('error')
    expect(result.ledger.errorCode).toBe('unauthorized')
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

describe('useCounterLaunchForm', () => {
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
      checkIn: { enabled: true, cooldownHours: 4 },
      expirationPolicy: { kind: 'never' },
    })
    const state: AsyncResultState<Program, TransportError> =
      rules === 'error' ? { status: 'error', error: { code: 'network' } } : { status: 'success', value: program }
    return { state: computed(() => state), reload: vi.fn(() => Promise.resolve()), set: vi.fn() }
  }

  function fakeLaunch(initial: CounterLaunchState = { status: 'idle' }): CounterLaunch & { state: Ref<CounterLaunchState> } {
    return {
      phone: ref(''),
      amount: ref(''),
      state: shallowRef(initial),
      submit: vi.fn(() => Promise.resolve(null)),
      clear: vi.fn(),
    }
  }

  const fakeLedger = (): CounterLedger => ({
    state: computed(() => ({ status: 'success', value: [] })),
    freshIds: ref(new Set<string>()),
    reload: vi.fn(() => Promise.resolve()),
    prepend: vi.fn(),
  })

  const perReal = (pointsPerReal: number): Program['rules'] => ({ mode: 'pointsPerCurrency', pointsPerReal, target: 150 })

  it('types digits into the amount only after the amount field was activated', async () => {
    const launch = fakeLaunch()
    const { result } = await mountComposable(() => useCounterLaunchForm(fakeProgram(perReal(1)), launch, fakeLedger(), vi.fn()))
    result.pressDigit('6')
    expect(launch.phone.value).toBe('6')
    result.setActiveField('amount')
    result.pressDigit('2')
    result.pressDigit('4')
    result.pressDigit('9')
    expect(launch.amount.value).toBe('249')
    expect(result.amountText.replace(/\s/g, ' ')).toBe('R$ 2,49')
    result.pressBackspace()
    expect(launch.amount.value).toBe('24')
    expect(launch.phone.value).toBe('6')
    result.setActiveField('phone')
    result.pressBackspace()
    expect(launch.phone.value).toBe('')
  })

  it('keeps only digits when the amount is typed and shows no text for an empty amount', async () => {
    const launch = fakeLaunch()
    const { result } = await mountComposable(() => useCounterLaunchForm(fakeProgram(perReal(2)), launch, fakeLedger(), vi.fn()))
    expect(result.amountText).toBe('')
    result.inputAmount('R$ 0,24a9')
    expect(launch.amount.value).toBe('249')
    result.inputAmount(1500)
    expect(launch.amount.value).toBe('1500')
    expect(result.amountHint).toBeTruthy()
    expect(result.submitLabel).toBe(t('counter.launch.giveAmount'))
  })

  it('moves to the amount field on Enter when the amount is still empty, without calling the launch', async () => {
    const launch = fakeLaunch()
    const focus = vi.fn()
    const { result } = await mountComposable(() => useCounterLaunchForm(fakeProgram(perReal(1)), launch, fakeLedger(), focus))
    await result.submit()
    expect(focus).toHaveBeenCalledWith('amount')
    expect(launch.submit).not.toHaveBeenCalled()
  })

  it('does nothing when the program is not loaded', async () => {
    const launch = fakeLaunch()
    const { result } = await mountComposable(() => useCounterLaunchForm(fakeProgram('error'), launch, fakeLedger(), vi.fn()))
    expect(result.programFailed).toBe(true)
    expect(result.action).toBeNull()
    await result.submit()
    expect(launch.submit).not.toHaveBeenCalled()
  })

  it('splits error codes between the phone field, the amount field and the alert', async () => {
    const launch = fakeLaunch({ status: 'error', code: 'invalidPhone' })
    const { result } = await mountComposable(() => useCounterLaunchForm(fakeProgram({ mode: 'stamps', target: 10 }), launch, fakeLedger(), vi.fn()))
    expect(result).toMatchObject({ phoneErrorCode: 'invalidPhone', amountErrorCode: null, alertCode: null })
    launch.state.value = { status: 'error', code: 'invalidAmount' }
    expect(result).toMatchObject({ phoneErrorCode: null, amountErrorCode: 'invalidAmount', alertCode: null })
    launch.state.value = { status: 'error', code: 'unauthorized' }
    expect(result).toMatchObject({ phoneErrorCode: null, amountErrorCode: null, alertCode: 'unauthorized' })
    launch.state.value = { status: 'pending' }
    expect(result.pending).toBe(true)
    expect(result.alertCode).toBeNull()
  })

  it('clears the form and refocuses the phone', async () => {
    const launch = fakeLaunch()
    const focus = vi.fn()
    const { result } = await mountComposable(() => useCounterLaunchForm(fakeProgram({ mode: 'stamps', target: 10 }), launch, fakeLedger(), focus))
    result.clear()
    expect(launch.clear).toHaveBeenCalled()
    expect(focus).toHaveBeenCalledWith('phone')
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
    const ledger: CounterLedger = { state: computed(() => state.value), freshIds: ref(new Set(['visit_1'])), reload, prepend: vi.fn() }
    const { result } = await mountComposable(() => useCounterLedgerView(ledger))
    expect(result).toMatchObject({ status: 'loading', errorCode: null, rows: [] })

    state.value = { status: 'success', value: [entry] }
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0]).toMatchObject({ id: 'visit_1', phone: '(67) 9••••-0374', fresh: true, badge: t('counter.ledger.newCustomer') })

    state.value = { status: 'error', error: { code: 'network' } }
    expect(result).toMatchObject({ status: 'error', errorCode: 'network', rows: [] })
    await result.reload()
    expect(reload).toHaveBeenCalled()
  })
})
