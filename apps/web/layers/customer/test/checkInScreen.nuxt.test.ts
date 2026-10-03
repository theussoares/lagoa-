import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { shallowRef } from 'vue'
import type { ShallowRef } from 'vue'
import { useNuxtApp, useRouter } from '#imports'
import { EXAMPLE_IDS } from '#layers/core/app/mock'
import { useSessionStore } from '#layers/core/app/stores/session'
import { anaSession } from '#layers/core/test/fixtures'
import { mountComposable } from '#layers/core/test/composableHarness.nuxt'
import { resetWorld, restoreClock } from '#layers/core/test/pageHarness.nuxt'
import { useCheckInScreen } from '../app/composables/useCheckInScreen'
import type { QrScannerStatus } from '../app/types/qrScanner'

const scanner = vi.hoisted(() => ({
  onDecode: undefined as ((content: string) => void) | undefined,
  status: undefined as { value: string } | undefined,
  start: vi.fn(),
  stop: vi.fn(),
}))
const { navigateToMock, vibrateMock } = vi.hoisted(() => ({ navigateToMock: vi.fn(), vibrateMock: vi.fn() }))

mockNuxtImport('navigateTo', () => navigateToMock)
mockNuxtImport('useHaptics', () => () => ({ vibrate: vibrateMock }))
// A câmera não roda em happy-dom: o leitor vira um controle que a gente aciona à mão.
mockNuxtImport('useQrScanner', () => (onDecode: (content: string) => void) => {
  scanner.onDecode = onDecode
  const status = shallowRef<QrScannerStatus>('off')
  scanner.status = status
  return { status, start: scanner.start, stop: scanner.stop }
})

const code = EXAMPLE_IDS.checkInCodes.barbershop
const STAMP_VIBRATION_MS = 15
const REWARD_VIBRATION_PATTERN = [15, 90, 35]

function setScannerStatus(status: QrScannerStatus): void {
  if (!scanner.status) throw new Error('scanner not created')
  ;(scanner.status as ShallowRef<QrScannerStatus>).value = status
}

function video(): HTMLVideoElement {
  return document.createElement('video')
}

/** O pedido de foco só carrega o alvo e o id: nunca o código digitado nem dado pessoal. */
function expectFocusRequestIsTargetAndId(request: unknown): void {
  expect(request).not.toBeNull()
  expect(Object.keys(request as object).sort()).toEqual(['id', 'target'])
  expect(JSON.stringify(request)).not.toContain(code)
}

beforeEach(async () => {
  resetWorld({ customer: anaSession })
  navigateToMock.mockReset()
  vibrateMock.mockReset()
  scanner.start.mockReset()
  scanner.stop.mockReset()
  scanner.onDecode = undefined
  scanner.status = undefined
  await useRouter().replace('/check-in')
})

afterEach(() => {
  vi.restoreAllMocks()
  restoreClock()
})

describe('useCheckInScreen: scanning', () => {
  it('starts on the camera view with the viewfinder starting and no announcement', async () => {
    const { result } = await mountComposable(useCheckInScreen)
    expect(result.view).toBe('scan')
    expect(result.viewfinderStatus).toBe('starting')
    expect(result.announcement).toBe('')
    expect(result.earned).toBeNull()
    expect(result.notice).toBeNull()
    expect(result.focusRequest).toBeNull()
  })

  it('offers the mock check-in code only in mock mode', async () => {
    const { result } = await mountComposable(useCheckInScreen)
    expect(result.mockCode).toBe(code)
  })

  it('starts the scanner once the video element arrives, and stops it when leaving the camera view', async () => {
    const { result } = await mountComposable(useCheckInScreen)
    const element = video()
    result.setVideo(element)
    await flushPromises()
    expect(scanner.start).toHaveBeenCalledWith(element)
    result.typeCode()
    await flushPromises()
    expect(scanner.stop).toHaveBeenCalled()
  })

  it('shows the viewfinder as scanning while the camera reads', async () => {
    const { result } = await mountComposable(useCheckInScreen)
    setScannerStatus('scanning')
    expect(result.viewfinderStatus).toBe('scanning')
  })

  it.each(['denied', 'unavailable'] as const)('falls back to typing the code when the camera is %s', async (issue) => {
    const { result } = await mountComposable(useCheckInScreen)
    setScannerStatus(issue)
    await flushPromises()
    expect(result.cameraIssue).toBe(issue)
    expect(result.view).toBe('type')
  })

  it('goes back to the camera and forgets the camera issue', async () => {
    const { result } = await mountComposable(useCheckInScreen)
    setScannerStatus('denied')
    await flushPromises()
    result.switchToCamera()
    expect(result.cameraIssue).toBeNull()
    expect(result.view).toBe('scan')
  })

  it('earns a stamp from a decoded QR and announces it', async () => {
    const { result } = await mountComposable(useCheckInScreen)
    scanner.onDecode?.(`https://app.example/check-in?loja=${code}`)
    await vi.waitFor(() => expect(result.view).toBe('earned'))
    expect(result.announcement).not.toBe('')
    expect(result.earned?.text.moment).toBeDefined()
  })

  it('shows the invalid QR notice, with the scan-again recovery, for a QR from elsewhere', async () => {
    const { result } = await mountComposable(useCheckInScreen)
    scanner.onDecode?.('not a shop qr')
    await vi.waitFor(() => expect(result.view).toBe('notice'))
    expect(result.notice?.recovery).toBe('scanAgain')
    result.recover()
    expect(result.view).toBe('scan')
    expect(result.notice).toBeNull()
  })
})

describe('useCheckInScreen: typed code', () => {
  it('earns the stamp, vibrates once, asks to focus the heading and remembers the balance', async () => {
    const { result } = await mountComposable(useCheckInScreen)
    result.typeCode()
    expect(result.view).toBe('type')
    result.code = [...code]
    result.submitTyped()
    await vi.waitFor(() => expect(result.view).toBe('earned'))
    await flushPromises()
    expect(vibrateMock).toHaveBeenCalledWith(STAMP_VIBRATION_MS)
    expect(result.focusRequest).toEqual({ target: 'earnedHeading', id: 1 })
    expectFocusRequestIsTargetAndId(result.focusRequest)
    expect(result.earned?.heroStamp.tone).toBe('ink')
    expect(result.earned?.rewardCardId).toBeNull()
    expect(window.localStorage.getItem('lagoa:seen-balances')).toContain('card_')
  })

  it('vibrates with the reward pattern and exposes the card to redeem when the stamp unlocks the reward', async () => {
    const { $mockBackend } = useNuxtApp()
    await $mockBackend.run((ctx) => {
      const shop = EXAMPLE_IDS.shops.barbershop
      const card = ctx.state.cards.find((item) => item.shopId === shop && item.customerId === EXAMPLE_IDS.customers.ana)
      if (card) card.balance = 9
    })
    const { result } = await mountComposable(useCheckInScreen)
    result.typeCode()
    result.code = [...code]
    result.submitTyped()
    await vi.waitFor(() => expect(result.view).toBe('earned'))
    await flushPromises()
    expect(result.earned?.text.moment).toBe('reward')
    expect(result.earned?.heroStamp.tone).toBe('reward')
    expect(result.earned?.rewardCardId).not.toBeNull()
    expect(vibrateMock).toHaveBeenCalledWith(REWARD_VIBRATION_PATTERN)
  })

  it('marks an unknown code as invalid, clears the cells and asks to focus the code field', async () => {
    const { result } = await mountComposable(useCheckInScreen)
    result.typeCode()
    result.code = [...'ACDEFG']
    result.submitTyped()
    await vi.waitFor(() => expect(result.codeInvalid).toBe(true))
    await flushPromises()
    expect(result.view).toBe('type')
    expect(result.notice).toBeNull()
    expect(result.code).toEqual([])
    expect(result.focusRequest).toEqual({ target: 'code', id: 1 })
    expectFocusRequestIsTargetAndId(result.focusRequest)
    expect(vibrateMock).not.toHaveBeenCalled()
  })

  it('shows the cooldown notice with the wallet recovery for a second check-in in the window', async () => {
    await useNuxtApp().$customerServices.checkIn.checkIn(code)
    const { result } = await mountComposable(useCheckInScreen)
    result.typeCode()
    result.code = [...code]
    result.submitTyped()
    await vi.waitFor(() => expect(result.view).toBe('notice'))
    expect(result.notice).toMatchObject({ tone: 'warning', recovery: 'wallet' })
    expect(result.typing).toBe(false)
  })

  it('does not clear the cells nor move the focus when the session expired, and signs out (session guard on)', async () => {
    const { result } = await mountComposable(useCheckInScreen)
    result.typeCode()
    useSessionStore().endCustomer()
    result.code = [...code]
    result.submitTyped()
    await vi.waitFor(() => expect(navigateToMock).toHaveBeenCalledWith('/entrar', { replace: true }))
    await flushPromises()
    expect(result.code.join('')).toBe(code)
    expect(result.focusRequest).toBeNull()
  })

  it('retries the same code after a network failure when the recovery is retry', async () => {
    const { $customerServices } = useNuxtApp()
    const original = $customerServices.checkIn.checkIn.bind($customerServices.checkIn)
    const spy = vi.spyOn($customerServices.checkIn, 'checkIn').mockResolvedValueOnce({ ok: false, error: { code: 'network' } })
    const { result } = await mountComposable(useCheckInScreen)
    result.typeCode()
    result.code = [...code]
    result.submitTyped()
    await vi.waitFor(() => expect(result.notice?.recovery).toBe('retry'))
    spy.mockImplementation(original)
    result.recover()
    await vi.waitFor(() => expect(result.view).toBe('earned'))
    expect(spy).toHaveBeenCalledTimes(2)
  })
})

describe('useCheckInScreen: link from the shop poster', () => {
  it('checks in on its own and takes the code out of the URL', async () => {
    const router = useRouter()
    const replace = vi.spyOn(router, 'replace')
    const { result } = await mountComposable(useCheckInScreen, { route: `/check-in?loja=${code}` })
    await vi.waitFor(() => expect(result.view).toBe('earned'))
    expect(replace).toHaveBeenCalledWith({ query: {} })
    await vi.waitFor(() => expect(router.currentRoute.value.query).toEqual({}))
  })

  it('shows the invalid QR notice for an unknown shop code in the link', async () => {
    const { result } = await mountComposable(useCheckInScreen, { route: '/check-in?loja=ACDEFG' })
    await vi.waitFor(() => expect(result.view).toBe('notice'))
    expect(result.notice?.recovery).toBe('scanAgain')
  })
})
