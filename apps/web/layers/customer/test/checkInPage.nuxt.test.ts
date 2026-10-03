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
import { CHECK_IN_CODE_LENGTH } from '#shared/constants/domain'
import CheckInPage from '../app/pages/check-in.vue'

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

const code = EXAMPLE_IDS.checkInCodes.barbershop

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
  await buttonByLabel(page, t('checkIn.typeCode')).trigger('click')
  await flushPromises()
}

function codeCells(page: VueWrapper): HTMLInputElement[] {
  const cells = page.findAll('form input').flatMap((cell) => (cell.element instanceof HTMLInputElement ? [cell.element] : []))
  return cells.slice(0, CHECK_IN_CODE_LENGTH)
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
  it('shows the camera screen first and offers to type the code', async () => {
    const page = await mountCheckIn()
    expect(visibleText(page)).toContain(t('checkIn.leadScan'))
    expect(scanner.start).toHaveBeenCalled()
  })

  it('shows the earned stamp and moves the focus to the title for a valid code', async () => {
    const page = await mountCheckIn()
    await openTypedMode(page)
    await typeCode(page.find('form').element, code)
    await vi.waitFor(() => expect(page.find('#earned-title').exists()).toBe(true))
    await vi.waitFor(() => expect(document.activeElement).toBe(page.find('#earned-title').element))
    expect(visibleText(page)).toContain(t('checkIn.toWallet'))
    expect(visibleText(page)).toMatchSnapshot()
  })

  it('clears the cells and returns the focus to the code field for an unknown code', async () => {
    const page = await mountCheckIn()
    await openTypedMode(page)
    await typeCode(page.find('form').element, 'ACDEFG')
    await vi.waitFor(() => expect(visibleText(page)).toContain(t('checkIn.invalidCode')))
    await vi.waitFor(() => expect(codeCells(page)[0]).toBe(document.activeElement))
    expect(codeCells(page).every((cell) => cell.value === '')).toBe(true)
  })

  it('shows the cooldown notice when the customer already checked in inside the window', async () => {
    const { $customerServices } = useNuxtApp()
    const first = await $customerServices.checkIn.checkIn(code)
    expect(first.ok).toBe(true)
    const page = await mountCheckIn()
    await openTypedMode(page)
    await typeCode(page.find('form').element, code)
    await vi.waitFor(() => expect(visibleText(page)).toContain(t('checkIn.notice.cooldownTitle')))
    expect(page.find('#earned-title').exists()).toBe(false)
  })

  it('signs out without clearing the cells or moving the focus when the session expired', async () => {
    const page = await mountCheckIn()
    await openTypedMode(page)
    const cells = codeCells(page)
    useSessionStore().endCustomer()
    await typeCode(page.find('form').element, code)
    await vi.waitFor(() => expect(navigateToMock).toHaveBeenCalledWith('/entrar', { replace: true }))
    await flushPromises()
    expect(codeCells(page).map((cell) => cell.value).join('')).toBe(code)
    expect(document.activeElement).toBe(cells.at(-1))
  })
})

describe('check-in page: link from the shop poster', () => {
  it('checks in on its own and takes the code out of the URL', async () => {
    const router = useRouter()
    const replace = vi.spyOn(router, 'replace')
    const page = await mountCheckIn(`/check-in?loja=${code}`)
    await vi.waitFor(() => expect(page.find('#earned-title').exists()).toBe(true))
    expect(replace).toHaveBeenCalledWith({ query: {} })
    await vi.waitFor(() => expect(router.currentRoute.value.query).toEqual({}))
  })

  it('shows the cooldown notice instead of a second stamp', async () => {
    const { $customerServices } = useNuxtApp()
    await $customerServices.checkIn.checkIn(code)
    const page = await mountCheckIn(`/check-in?loja=${code}`)
    await vi.waitFor(() => expect(visibleText(page)).toContain(t('checkIn.notice.cooldownTitle')))
  })

  it('shows the invalid QR notice for an unknown shop code', async () => {
    const page = await mountCheckIn('/check-in?loja=ACDEFG')
    await vi.waitFor(() => expect(visibleText(page)).toContain(t('checkIn.notice.invalidQrTitle')))
  })
})

describe('check-in page: camera', () => {
  it('submits the decoded QR as a camera check-in', async () => {
    const page = await mountCheckIn()
    expect(scanner.onDecode).toBeDefined()
    scanner.onDecode?.(`https://app.example/check-in?loja=${code}`)
    await vi.waitFor(() => expect(page.find('#earned-title').exists()).toBe(true))
  })

  it('treats a QR that is not from a Lagoa+ shop as an invalid QR, not as a typed error', async () => {
    const page = await mountCheckIn()
    scanner.onDecode?.('not a shop qr')
    await vi.waitFor(() => expect(visibleText(page)).toContain(t('checkIn.notice.invalidQrTitle')))
  })
})
