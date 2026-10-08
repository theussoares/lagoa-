import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { shallowRef } from 'vue'
import type { ShallowRef } from 'vue'
import { CHECK_IN_CODE_LENGTH, VISIT_CODE_LENGTH } from '#shared/constants/domain'
import { useNuxtApp, useRouter } from '#imports'
import { EXAMPLE_IDS } from '#layers/core/app/mock'
import { useSessionStore } from '#layers/core/app/stores/session'
import { anaSession } from '#layers/core/test/fixtures'
import { mountComposable } from '#layers/core/test/composableHarness.nuxt'
import { resetWorld, restoreClock } from '#layers/core/test/pageHarness.nuxt'
import { useCheckInScreen } from '../app/composables/useCheckInScreen'
import { claimAsJoao, issueTestVisitQr, visitQrContent } from './checkInHarness.nuxt'
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

const shopCode = EXAMPLE_IDS.checkInCodes.barbershop
const newShopCode = EXAMPLE_IDS.checkInCodes.bakery
const STAMP_VIBRATION_MS = 15
const REWARD_VIBRATION_PATTERN = [15, 90, 35]

function setScannerStatus(status: QrScannerStatus): void {
  if (!scanner.status) throw new Error('scanner not created')
  ;(scanner.status as ShallowRef<QrScannerStatus>).value = status
}

function t(key: string): string {
  return useNuxtApp().$i18n.t(key)
}

function video(): HTMLVideoElement {
  return document.createElement('video')
}

/** O pedido de foco só carrega o alvo e o id: nunca o código digitado nem dado pessoal. */
function expectFocusRequestIsTargetAndId(request: unknown): void {
  expect(request).not.toBeNull()
  expect(Object.keys(request as object).sort()).toEqual(['id', 'target'])
  expect(JSON.stringify(request)).not.toContain(shopCode)
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
    expect(result.joined).toBeNull()
    expect(result.notice).toBeNull()
    expect(result.focusRequest).toBeNull()
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

  it('earns a stamp from a decoded visit QR and announces it', async () => {
    const qr = await issueTestVisitQr()
    const { result } = await mountComposable(useCheckInScreen)
    scanner.onDecode?.(visitQrContent(qr))
    await vi.waitFor(() => expect(result.view).toBe('earned'))
    expect(result.announcement).not.toBe('')
    expect(result.earned?.text.moment).toBeDefined()
  })

  it('joins the club from a decoded shop QR, without a stamp and without vibrating', async () => {
    const { result } = await mountComposable(useCheckInScreen)
    scanner.onDecode?.(`https://app.example/check-in?loja=${newShopCode}`)
    await vi.waitFor(() => expect(result.view).toBe('joined'))
    await flushPromises()
    expect(result.earned).toBeNull()
    expect(result.joined?.text.title).toBe(t('checkIn.joined.title'))
    expect(result.announcement).toContain(t('checkIn.joined.title'))
    expect(result.focusRequest).toEqual({ target: 'joinedHeading', id: 1 })
    expect(vibrateMock).not.toHaveBeenCalled()
  })

  it('shows the viewfinder as joining while the shop QR is sent', async () => {
    const { $customerServices } = useNuxtApp()
    const pending = Promise.withResolvers<Awaited<ReturnType<typeof $customerServices.checkIn.joinShop>>>()
    vi.spyOn($customerServices.checkIn, 'joinShop').mockReturnValue(pending.promise)
    const { result } = await mountComposable(useCheckInScreen)
    scanner.onDecode?.(`https://app.example/check-in?loja=${newShopCode}`)
    await vi.waitFor(() => expect(result.viewfinderStatus).toBe('joining'))
    pending.resolve({ ok: false, error: { code: 'network' } })
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

  it('asks for a new QR when the visit QR was already used', async () => {
    const qr = await issueTestVisitQr()
    await claimAsJoao(qr)
    const { result } = await mountComposable(useCheckInScreen)
    scanner.onDecode?.(visitQrContent(qr))
    await vi.waitFor(() => expect(result.view).toBe('notice'))
    expect(result.notice).toMatchObject({ title: t('checkIn.notice.visitQrUsedTitle'), recovery: 'scanAgain' })
  })
})

describe('useCheckInScreen: typed code', () => {
  it('types the visit code by default, with its length', async () => {
    const { result } = await mountComposable(useCheckInScreen)
    expect(result.codeKind).toBe('visit')
    expect(result.codeLength).toBe(VISIT_CODE_LENGTH)
  })

  it('earns the stamp, vibrates once, asks to focus the heading and remembers the balance', async () => {
    const qr = await issueTestVisitQr()
    const { result } = await mountComposable(useCheckInScreen)
    result.typeCode()
    expect(result.view).toBe('type')
    result.code = [...qr.visitCode]
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
    const qr = await issueTestVisitQr()
    const { result } = await mountComposable(useCheckInScreen)
    result.typeCode()
    result.code = [...qr.visitCode]
    result.submitTyped()
    await vi.waitFor(() => expect(result.view).toBe('earned'))
    await flushPromises()
    expect(result.earned?.text.moment).toBe('reward')
    expect(result.earned?.heroStamp.tone).toBe('reward')
    expect(result.earned?.rewardCardId).not.toBeNull()
    expect(vibrateMock).toHaveBeenCalledWith(REWARD_VIBRATION_PATTERN)
  })

  it('marks an unknown visit code as invalid, clears the cells and asks to focus the code field', async () => {
    const { result } = await mountComposable(useCheckInScreen)
    result.typeCode()
    result.code = [...'K7M3P']
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

  it('switches to the shop code, with six cells, clearing the field and the error, and back', async () => {
    const { result } = await mountComposable(useCheckInScreen)
    result.typeCode()
    result.code = [...'K7M3P']
    result.submitTyped()
    await vi.waitFor(() => expect(result.codeInvalid).toBe(true))
    result.code = [...'K7M']
    result.switchCodeKind()
    await flushPromises()
    expect(result.codeKind).toBe('shop')
    expect(result.codeLength).toBe(CHECK_IN_CODE_LENGTH)
    expect(result.code).toEqual([])
    expect(result.codeInvalid).toBe(false)
    expect(result.focusRequest?.target).toBe('code')
    result.switchCodeKind()
    expect(result.codeKind).toBe('visit')
  })

  it('joins the club with the typed shop code', async () => {
    const { result } = await mountComposable(useCheckInScreen)
    result.typeCode()
    result.switchCodeKind()
    result.code = [...newShopCode]
    result.submitTyped()
    await vi.waitFor(() => expect(result.view).toBe('joined'))
    expect(result.joined?.card).not.toBeNull()
  })

  it('marks a shop code typed in the visit mode as invalid, without calling the service', async () => {
    const claim = vi.spyOn(useNuxtApp().$customerServices.checkIn, 'claimVisitQr')
    const { result } = await mountComposable(useCheckInScreen)
    result.typeCode()
    result.code = [...shopCode]
    result.submitTyped()
    await vi.waitFor(() => expect(result.codeInvalid).toBe(true))
    expect(claim).not.toHaveBeenCalled()
  })

  it('shows the cooldown notice with the wallet recovery for a second visit in the window', async () => {
    const first = await issueTestVisitQr()
    await useNuxtApp().$customerServices.checkIn.claimVisitQr({ kind: 'token', token: first.token })
    const second = await issueTestVisitQr()
    const { result } = await mountComposable(useCheckInScreen)
    result.typeCode()
    result.code = [...second.visitCode]
    result.submitTyped()
    await vi.waitFor(() => expect(result.view).toBe('notice'))
    expect(result.notice).toMatchObject({ tone: 'warning', recovery: 'wallet' })
    expect(result.typing).toBe(false)
  })

  it('does not clear the cells nor move the focus when the session expired, and signs out (session guard on)', async () => {
    const qr = await issueTestVisitQr()
    const { result } = await mountComposable(useCheckInScreen)
    result.typeCode()
    useSessionStore().endCustomer()
    result.code = [...qr.visitCode]
    result.submitTyped()
    await vi.waitFor(() => expect(navigateToMock).toHaveBeenCalledWith('/entrar', { replace: true }))
    await flushPromises()
    expect(result.code.join('')).toBe(qr.visitCode)
    expect(result.focusRequest).toBeNull()
  })

  it('retries the same visit code after a network failure when the recovery is retry', async () => {
    const qr = await issueTestVisitQr()
    const { $customerServices } = useNuxtApp()
    const original = $customerServices.checkIn.claimVisitQr.bind($customerServices.checkIn)
    const spy = vi.spyOn($customerServices.checkIn, 'claimVisitQr').mockResolvedValueOnce({ ok: false, error: { code: 'network' } })
    const { result } = await mountComposable(useCheckInScreen)
    result.typeCode()
    result.code = [...qr.visitCode]
    result.submitTyped()
    await vi.waitFor(() => expect(result.notice?.recovery).toBe('retry'))
    spy.mockImplementation(original)
    result.recover()
    await vi.waitFor(() => expect(result.view).toBe('earned'))
    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy).toHaveBeenLastCalledWith({ kind: 'visitCode', code: qr.visitCode })
  })
})

describe('useCheckInScreen: link from the shop poster', () => {
  it('joins the club on its own and takes the code out of the URL', async () => {
    const router = useRouter()
    const replace = vi.spyOn(router, 'replace')
    const { result } = await mountComposable(useCheckInScreen, { route: `/check-in?loja=${newShopCode}` })
    await vi.waitFor(() => expect(result.view).toBe('joined'))
    expect(replace).toHaveBeenCalledWith({ query: {}, hash: '' })
    await vi.waitFor(() => expect(router.currentRoute.value.query).toEqual({}))
  })

  it('shows the invalid QR notice for a malformed shop code in the link', async () => {
    const { result } = await mountComposable(useCheckInScreen, { route: '/check-in?loja=ACDEFG' })
    await vi.waitFor(() => expect(result.view).toBe('notice'))
    expect(result.notice?.recovery).toBe('scanAgain')
  })
})

describe('useCheckInScreen: link from the visit QR', () => {
  it('earns the stamp on its own and takes the token out of the URL', async () => {
    const qr = await issueTestVisitQr()
    const router = useRouter()
    const replace = vi.spyOn(router, 'replace')
    const { result } = await mountComposable(useCheckInScreen, { route: `/check-in#visita=${qr.token}` })
    await vi.waitFor(() => expect(result.view).toBe('earned'))
    expect(replace).toHaveBeenCalledWith({ query: {}, hash: '' })
    await vi.waitFor(() => expect(router.currentRoute.value.hash).toBe(''))
    expect(router.currentRoute.value.fullPath).not.toContain(qr.token)
  })

  it('never turns the camera on for a visit link, not even for a moment', async () => {
    const qr = await issueTestVisitQr()
    const { result } = await mountComposable(useCheckInScreen, { route: `/check-in#visita=${qr.token}` })
    result.setVideo(video())
    await flushPromises()
    expect(scanner.start).not.toHaveBeenCalled()
    await vi.waitFor(() => expect(result.view).toBe('earned'))
    expect(scanner.start).not.toHaveBeenCalled()
  })

  it('shows the invalid QR notice for a malformed token, and the camera comes back on scan again', async () => {
    const { result } = await mountComposable(useCheckInScreen, { route: '/check-in#visita=curto' })
    await vi.waitFor(() => expect(result.view).toBe('notice'))
    expect(result.notice).toMatchObject({ title: t('checkIn.notice.invalidVisitQrTitle'), recovery: 'scanAgain' })
    result.recover()
    result.setVideo(video())
    await flushPromises()
    expect(scanner.start).toHaveBeenCalled()
  })

  it('prefers the visit fragment over the poster code', async () => {
    const qr = await issueTestVisitQr()
    const claim = vi.spyOn(useNuxtApp().$customerServices.checkIn, 'claimVisitQr')
    const join = vi.spyOn(useNuxtApp().$customerServices.checkIn, 'joinShop')
    const { result } = await mountComposable(useCheckInScreen, { route: `/check-in?loja=${newShopCode}#visita=${qr.token}` })
    await vi.waitFor(() => expect(result.view).toBe('earned'))
    expect(claim).toHaveBeenCalledTimes(1)
    expect(join).not.toHaveBeenCalled()
  })
})
