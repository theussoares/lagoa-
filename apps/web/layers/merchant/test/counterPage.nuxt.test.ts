import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { useNuxtApp } from '#imports'
import { EXAMPLE_IDS } from '#layers/core/app/mock'
import { useSessionStore } from '#layers/core/app/stores/session'
import { useMerchantSessionStore } from '#layers/merchant/app/stores/merchantSession'
import { anaSession, barbershopSession, cafeSession } from '#layers/core/test/fixtures'
import { resetWorld, restoreClock, typeCode, typeInto, visibleText } from '#layers/core/test/pageHarness.nuxt'
import type { MerchantSession } from '#shared/schemas/session'
import CounterPage from '../app/pages/counter.vue'

const { navigateToMock, refreshShopStatusMock } = vi.hoisted(() => ({
  navigateToMock: vi.fn(),
  refreshShopStatusMock: vi.fn(),
}))
mockNuxtImport('navigateTo', () => navigateToMock)
mockNuxtImport('useShopStatus', () => () => ({ status: { value: 'approved' }, refresh: refreshShopStatusMock, approveForTesting: null }))

const phones = EXAMPLE_IDS.phones
const pizzeriaSession: MerchantSession = {
  ...barbershopSession,
  shopId: EXAMPLE_IDS.shops.pizzeria,
  shopName: 'Pizzaria Forno a Lenha',
}
const gymSession: MerchantSession = { ...barbershopSession, shopId: EXAMPLE_IDS.shops.gym, shopName: 'Academia Movimento' }

let wrapper: VueWrapper | undefined

async function mountCounter(): Promise<VueWrapper> {
  wrapper = await mountSuspended(CounterPage, { attachTo: document.body })
  await vi.waitFor(() => expect(wrapper?.find('[role="status"]').exists()).toBe(false))
  await flushPromises()
  return wrapper
}

function issueButton(page: VueWrapper): ReturnType<VueWrapper['get']> {
  return page.get('form button[type="submit"]')
}

function amountInput(page: VueWrapper): HTMLInputElement {
  const input = page.find('form input').element
  if (!(input instanceof HTMLInputElement)) throw new Error('amount input missing')
  return input
}

function buttonByLabel(page: VueWrapper, label: string): ReturnType<VueWrapper['get']> {
  const found = page.findAll('button').find((item) => item.text() === label)
  if (!found) throw new Error(`button "${label}" missing`)
  return found
}

function t(key: string, named?: Record<string, unknown>, plural?: number): string {
  return useNuxtApp().$i18n.t(key, named ?? {}, plural ?? 1)
}

beforeEach(() => {
  resetWorld({ merchant: barbershopSession })
  navigateToMock.mockReset()
  refreshShopStatusMock.mockReset()
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
  restoreClock()
})

function codeCells(page: VueWrapper): ParentNode {
  const stub = page.findAll('section').find((section) => section.find('h2').text() === t('counter.redemption.title'))
  if (!stub) throw new Error('redemption stub missing')
  return stub.element
}

function firstCodeCell(page: VueWrapper): Element | null {
  return codeCells(page).querySelector('input')
}

async function requestPizzeriaCode(): Promise<string> {
  useSessionStore().startCustomer(anaSession)
  const { $customerServices } = useNuxtApp()
  const card = await $customerServices.wallet.getCard(EXAMPLE_IDS.shops.pizzeria)
  if (!card.ok) throw new Error(card.error.code)
  const redemption = await $customerServices.redemption.requestCode(card.value.id)
  if (!redemption.ok) throw new Error(redemption.error.code)
  return redemption.value.code
}

describe('counter page: the visit QR', () => {
  it('shows the empty counter on mount, with no phone field and the issue button focused (CA-24)', async () => {
    const page = await mountCounter()
    expect(visibleText(page)).toMatchSnapshot()
    expect(page.find('input[type="tel"]').exists()).toBe(false)
    expect(visibleText(page)).not.toContain('Celular do cliente')
    expect(issueButton(page).element).toBe(document.activeElement)
  })

  it('issues a QR on Enter: the QR, the code to type and the countdown take the place of the form (CA-09)', async () => {
    const page = await mountCounter()
    await page.get('form').trigger('submit')
    await vi.waitFor(() => expect(page.find('svg[role="img"]').exists()).toBe(true))
    const text = visibleText(page)
    expect(text).toContain(t('counter.visitQr.codeLabel'))
    expect(text).toContain(t('counter.visitQr.status.active'))
    expect(text).toContain(t('counter.visitQr.expiresIn', { time: '5:00' }))
    expect(page.find('form').exists()).toBe(false)
    expect(page.get('svg[role="img"]').attributes('aria-label')).toMatch(/^QR da visita, vale até \d{2}:\d{2}$/)
    expect(page.get('[role="status"]').text()).toBe(t('counter.visitQr.status.active'))
  })

  it('cancels the QR, then offers another QR with the focus on it', async () => {
    const page = await mountCounter()
    await page.get('form').trigger('submit')
    await vi.waitFor(() => expect(page.find('svg[role="img"]').exists()).toBe(true))
    await buttonByLabel(page, t('counter.visitQr.cancel')).trigger('click')
    await vi.waitFor(() => expect(visibleText(page)).toContain(t('counter.visitQr.status.cancelled')))
    expect(page.find('svg[role="img"]').exists()).toBe(false)
    const another = buttonByLabel(page, t('counter.visitQr.issueAnother'))
    await vi.waitFor(() => expect(another.element).toBe(document.activeElement))
    await another.trigger('click')
    await vi.waitFor(() => expect(page.find('form').exists()).toBe(true))
    await vi.waitFor(() => expect(issueButton(page).element).toBe(document.activeElement))
  })

  it('CA-22: the QR turns into "used" and the ledger gets the masked row (simulated customer)', async () => {
    const page = await mountCounter()
    await page.get('form').trigger('submit')
    await vi.waitFor(() => expect(page.find('svg[role="img"]').exists()).toBe(true))
    await buttonByLabel(page, t('counter.visitQr.simulateClaim')).trigger('click')
    await vi.waitFor(() => expect(visibleText(page)).toContain(t('counter.todayCount', { count: 4 }, 4)))
    const text = visibleText(page)
    expect(text).toContain(t('counter.visitQr.status.claimed'))
    expect(text).toMatch(/\(67\) 9••••-\d{4}/)
    expect(text).not.toMatch(/\d{10,}/)
    expect(page.find('svg[role="img"]').exists()).toBe(false)
    await vi.waitFor(() => expect(buttonByLabel(page, t('counter.visitQr.issueAnother')).element).toBe(document.activeElement))
  })
})

describe('counter page: amount mode', () => {
  beforeEach(() => {
    resetWorld({ merchant: cafeSession })
  })

  it('focuses the amount field and previews the points of the typed amount', async () => {
    const page = await mountCounter()
    expect(amountInput(page)).toBe(document.activeElement)
    expect(visibleText(page)).toContain('Vale 1 ponto por real gasto.')
    await typeInto(amountInput(page), '2500')
    expect(amountInput(page).value).toContain('25,00')
    expect(visibleText(page)).toContain('vale 25 pontos (antes de bônus).')
    expect(issueButton(page).text()).toContain('25,00')
  })

  it('CA-09: Enter with the amount issues a QR pinned to it and clears the field', async () => {
    const page = await mountCounter()
    await typeInto(amountInput(page), '2500')
    await page.get('form').trigger('submit')
    await vi.waitFor(() => expect(page.find('svg[role="img"]').exists()).toBe(true))
    await buttonByLabel(page, t('counter.visitQr.cancel')).trigger('click')
    await buttonByLabel(page, t('counter.visitQr.issueAnother')).trigger('click')
    await vi.waitFor(() => expect(page.find('form').exists()).toBe(true))
    expect(amountInput(page).value).toBe('')
    await vi.waitFor(() => expect(amountInput(page)).toBe(document.activeElement))
  })

  it('asks for an amount when it is missing and keeps the focus on the field', async () => {
    const page = await mountCounter()
    await page.get('form').trigger('submit')
    await vi.waitFor(() => expect(visibleText(page)).toContain(t('errors.invalidAmount')))
    expect(amountInput(page).getAttribute('aria-invalid')).toBe('true')
    expect(amountInput(page)).toBe(document.activeElement)
  })
})

describe('counter page: redemption', () => {
  beforeEach(() => {
    resetWorld({ merchant: pizzeriaSession })
  })

  it('validates a correct code, shows the masked phone and delivers the reward', async () => {
    const code = await requestPizzeriaCode()
    const page = await mountCounter()
    await typeCode(codeCells(page), code)
    await vi.waitFor(() => expect(visibleText(page)).toContain(t('counter.redemption.valid')))
    const preview = visibleText(page)
    expect(preview).toContain('(67) 9••••-0001')
    expect(preview).not.toContain(phones.ana)
    expect(preview).toMatchSnapshot()

    const deliver = page.findAll('button').find((button) => button.text() === t('counter.redemption.deliver'))
    if (!deliver) throw new Error('deliver button missing')
    await deliver.trigger('click')
    await vi.waitFor(() => expect(visibleText(page)).toContain(t('counter.redemption.delivered', { reward: 'Pizza média' })))
  })

  it('clears the cells and returns the focus to the stub when the code is wrong', async () => {
    const page = await mountCounter()
    await typeCode(codeCells(page), 'ACDEFG')
    await vi.waitFor(() => expect(visibleText(page)).toContain(t('errors.redemptionInvalid')))
    const cells = [...codeCells(page).querySelectorAll('input')]
    expect(cells.every((cell) => cell instanceof HTMLInputElement && cell.value === '')).toBe(true)
    expect(firstCodeCell(page)).toBe(document.activeElement)
  })

  it('cancels a previewed redemption and clears the cells', async () => {
    const code = await requestPizzeriaCode()
    const page = await mountCounter()
    await typeCode(codeCells(page), code)
    await vi.waitFor(() => expect(visibleText(page)).toContain(t('counter.redemption.valid')))
    const cancel = page.findAll('button').find((button) => button.text() === t('counter.redemption.cancel'))
    if (!cancel) throw new Error('cancel button missing')
    await cancel.trigger('click')
    await flushPromises()
    expect(visibleText(page)).not.toContain(t('counter.redemption.valid'))
    expect(firstCodeCell(page)).toBe(document.activeElement)
  })
})

describe('counter page: session and shop status', () => {
  it('ends the merchant session when the server answers unauthorized', async () => {
    const page = await mountCounter()
    useMerchantSessionStore().endMerchant()
    await page.get('form').trigger('submit')
    await vi.waitFor(() => expect(navigateToMock).toHaveBeenCalledWith('/balcao/entrar', { replace: true }))
    expect(useMerchantSessionStore().merchant).toBeNull()
  })

  it('refreshes the shop status when the shop is still pending approval', async () => {
    resetWorld({ merchant: gymSession })
    const page = await mountCounter()
    await page.get('form').trigger('submit')
    await vi.waitFor(() => expect(refreshShopStatusMock).toHaveBeenCalled())
    expect(navigateToMock).not.toHaveBeenCalled()
    expect(useMerchantSessionStore().merchant).not.toBeNull()
  })

  it('refreshes the shop status when the network suspended the shop', async () => {
    const page = await mountCounter()
    await useNuxtApp().$mockBackend.run((ctx) => {
      const shop = ctx.state.shops.find((item) => item.id === EXAMPLE_IDS.shops.barbershop)
      if (shop) shop.status = 'suspended'
    })
    await page.get('form').trigger('submit')
    await vi.waitFor(() => expect(refreshShopStatusMock).toHaveBeenCalled())
    expect(navigateToMock).not.toHaveBeenCalled()
  })
})
