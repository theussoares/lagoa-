import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { shallowRef } from 'vue'
import { useNuxtApp, useRouter } from '#imports'
import { EXAMPLE_IDS } from '#layers/core/app/mock'
import { useSessionStore } from '#layers/core/app/stores/session'
import { anaSession } from '#layers/core/test/fixtures'
import { resetWorld, restoreClock, typeCode, visibleText } from '#layers/core/test/pageHarness.nuxt'
import { CHECK_IN_CODE_LENGTH, VISIT_CODE_LENGTH } from '#shared/constants/domain'
import CheckInPage from '../app/pages/check-in.vue'
import { claimAsJoao, issueTestVisitQr, visitQrContent } from './checkInHarness.nuxt'

const scanner = vi.hoisted(() => ({
  onDecode: undefined as ((content: string) => void) | undefined,
  start: vi.fn(),
  stop: vi.fn(),
}))
const { navigateToMock } = vi.hoisted(() => ({ navigateToMock: vi.fn() }))

mockNuxtImport('navigateTo', () => navigateToMock)
// A câmera não roda em happy-dom: o leitor vira um controle que a gente aciona à mão.
mockNuxtImport('useQrScanner', () => (onDecode: (content: string) => void) => {
  scanner.onDecode = onDecode
  return { status: shallowRef('off'), start: scanner.start, stop: scanner.stop }
})

const newShopCode = EXAMPLE_IDS.checkInCodes.bakery

let wrapper: VueWrapper | undefined

async function mountCheckIn(route = '/check-in'): Promise<VueWrapper> {
  wrapper = await mountSuspended(CheckInPage, { route, attachTo: document.body })
  await flushPromises()
  return wrapper
}

function t(key: string, named?: Record<string, unknown>): string {
  return useNuxtApp().$i18n.t(key, named ?? {})
}

function buttonByLabel(page: VueWrapper, label: string): ReturnType<VueWrapper['find']> {
  const button = page.findAll('button').find((item) => item.text() === label)
  if (!button) throw new Error(`button "${label}" missing`)
  return button
}

async function openTypedMode(page: VueWrapper): Promise<void> {
  await buttonByLabel(page, t('checkIn.typeVisitCode')).trigger('click')
  await flushPromises()
}

function codeCells(page: VueWrapper, length = VISIT_CODE_LENGTH): HTMLInputElement[] {
  const cells = page.findAll('form input').flatMap((cell) => (cell.element instanceof HTMLInputElement ? [cell.element] : []))
  return cells.slice(0, length)
}

async function replaceCurrentRoute(path: string): Promise<void> {
  await useRouter().replace(path)
}

beforeEach(async () => {
  resetWorld({ customer: anaSession })
  navigateToMock.mockReset()
  scanner.start.mockReset()
  scanner.stop.mockReset()
  scanner.onDecode = undefined
  await replaceCurrentRoute('/check-in')
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
  vi.restoreAllMocks()
  restoreClock()
})

describe('check-in page: typed code', () => {
  it('shows the camera screen first and offers to type the visit code', async () => {
    const page = await mountCheckIn()
    expect(visibleText(page)).toContain(t('checkIn.leadScan'))
    expect(visibleText(page)).toContain(t('checkIn.typeVisitCode'))
    expect(scanner.start).toHaveBeenCalled()
  })

  it('shows the earned stamp and moves the focus to the title for a valid visit code', async () => {
    const qr = await issueTestVisitQr()
    const page = await mountCheckIn()
    await openTypedMode(page)
    expect(codeCells(page)).toHaveLength(VISIT_CODE_LENGTH)
    await typeCode(page.find('form').element, qr.visitCode)
    await vi.waitFor(() => expect(page.find('#earned-title').exists()).toBe(true))
    await vi.waitFor(() => expect(document.activeElement).toBe(page.find('#earned-title').element))
    expect(visibleText(page)).toContain(t('checkIn.toWallet'))
    expect(visibleText(page)).toMatchSnapshot()
  })

  it('clears the cells and returns the focus to the code field for an unknown visit code', async () => {
    const page = await mountCheckIn()
    await openTypedMode(page)
    await typeCode(page.find('form').element, 'K7M3P')
    await vi.waitFor(() => expect(visibleText(page)).toContain(t('checkIn.invalidVisitCode')))
    await vi.waitFor(() => expect(codeCells(page)[0]).toBe(document.activeElement))
    expect(codeCells(page).every((cell) => cell.value === '')).toBe(true)
  })

  it('switches to the shop code and joins the club, then shows the joined screen with the focus on its title', async () => {
    const page = await mountCheckIn()
    await openTypedMode(page)
    await buttonByLabel(page, t('checkIn.typeShopCode')).trigger('click')
    await flushPromises()
    expect(visibleText(page)).toContain(t('checkIn.shopCodeLabel'))
    expect(codeCells(page, CHECK_IN_CODE_LENGTH)).toHaveLength(CHECK_IN_CODE_LENGTH)
    await typeCode(page.find('form').element, newShopCode)
    await vi.waitFor(() => expect(page.find('#joined-title').exists()).toBe(true))
    await vi.waitFor(() => expect(document.activeElement).toBe(page.find('#joined-title').element))
    expect(visibleText(page)).toContain(t('checkIn.joined.next'))
    expect(visibleText(page)).toMatchSnapshot()
  })

  it('shows the cooldown notice when the customer already earned inside the window', async () => {
    const { $customerServices } = useNuxtApp()
    const first = await issueTestVisitQr()
    expect((await $customerServices.checkIn.claimVisitQr({ kind: 'token', token: first.token })).ok).toBe(true)
    const second = await issueTestVisitQr()
    const page = await mountCheckIn()
    await openTypedMode(page)
    await typeCode(page.find('form').element, second.visitCode)
    await vi.waitFor(() => expect(visibleText(page)).toContain(t('checkIn.notice.cooldownTitle')))
    expect(page.find('#earned-title').exists()).toBe(false)
  })

  it('signs out without clearing the cells or moving the focus when the session expired', async () => {
    const qr = await issueTestVisitQr()
    const page = await mountCheckIn()
    await openTypedMode(page)
    const cells = codeCells(page)
    useSessionStore().endCustomer()
    await typeCode(page.find('form').element, qr.visitCode)
    await vi.waitFor(() => expect(navigateToMock).toHaveBeenCalledWith('/entrar', { replace: true }))
    await flushPromises()
    expect(codeCells(page).map((cell) => cell.value).join('')).toBe(qr.visitCode)
    expect(document.activeElement).toBe(cells.at(-1))
  })
})

describe('check-in page: link from the shop poster', () => {
  it('joins the club on its own and takes the code out of the URL', async () => {
    const router = useRouter()
    const replace = vi.spyOn(router, 'replace')
    const page = await mountCheckIn(`/check-in?loja=${newShopCode}`)
    await vi.waitFor(() => expect(page.find('#joined-title').exists()).toBe(true))
    expect(replace).toHaveBeenCalledWith({ query: {}, hash: '' })
    await vi.waitFor(() => expect(router.currentRoute.value.query).toEqual({}))
  })

  it('shows the invalid QR notice for a malformed shop code', async () => {
    const page = await mountCheckIn('/check-in?loja=ACDEFG')
    await vi.waitFor(() => expect(visibleText(page)).toContain(t('checkIn.notice.invalidQrTitle')))
  })
})

describe('check-in page: link from the visit QR', () => {
  it('earns the stamp on its own, with no camera, and takes the token out of the URL', async () => {
    const qr = await issueTestVisitQr()
    const router = useRouter()
    const page = await mountCheckIn(`/check-in#visita=${qr.token}`)
    await vi.waitFor(() => expect(page.find('#earned-title').exists()).toBe(true))
    expect(scanner.start).not.toHaveBeenCalled()
    await vi.waitFor(() => expect(router.currentRoute.value.hash).toBe(''))
    expect(router.currentRoute.value.fullPath).not.toContain(qr.token)
  })

  it('shows the already used notice instead of a second stamp', async () => {
    const qr = await issueTestVisitQr()
    await claimAsJoao(qr)
    const page = await mountCheckIn(`/check-in#visita=${qr.token}`)
    await vi.waitFor(() => expect(visibleText(page)).toContain(t('checkIn.notice.visitQrUsedTitle')))
    expect(visibleText(page)).toContain(t('errors.visitQrAlreadyUsed'))
  })
})

describe('check-in page: camera', () => {
  it('submits the decoded visit QR as a camera check-in', async () => {
    const qr = await issueTestVisitQr()
    const page = await mountCheckIn()
    expect(scanner.onDecode).toBeDefined()
    scanner.onDecode?.(visitQrContent(qr))
    await vi.waitFor(() => expect(page.find('#earned-title').exists()).toBe(true))
  })

  it('joins the club with the decoded shop QR', async () => {
    const page = await mountCheckIn()
    scanner.onDecode?.(`https://app.example/check-in?loja=${newShopCode}`)
    await vi.waitFor(() => expect(page.find('#joined-title').exists()).toBe(true))
  })

  it('treats a QR that is not from a Lagoa+ shop as an invalid QR, not as a typed error', async () => {
    const page = await mountCheckIn()
    scanner.onDecode?.('not a shop qr')
    await vi.waitFor(() => expect(visibleText(page)).toContain(t('checkIn.notice.invalidQrTitle')))
  })
})
