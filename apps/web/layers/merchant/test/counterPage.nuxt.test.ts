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

function phoneInput(page: VueWrapper): HTMLInputElement {
  const input = page.find('input[type="tel"]').element
  if (!(input instanceof HTMLInputElement)) throw new Error('phone input missing')
  return input
}

function submitForm(page: VueWrapper): Promise<void> {
  return page.find('form').trigger('submit')
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

describe('counter page: launching a visit', () => {
  it('shows the empty counter on mount', async () => {
    const page = await mountCounter()
    expect(visibleText(page)).toMatchSnapshot()
    expect(phoneInput(page)).toBe(document.activeElement)
  })

  it('launches a visit for an existing customer typed in the phone field', async () => {
    const page = await mountCounter()
    await typeInto(phoneInput(page), phones.joao)
    await submitForm(page)
    await vi.waitFor(() => expect(visibleText(page)).toContain(t('counter.todayCount', { count: 4 }, 4)))
    const text = visibleText(page)
    expect(text).toContain('(67) 9••••-0002')
    expect(text).not.toContain(phones.joao)
    expect(phoneInput(page).value).toBe('')
    expect(phoneInput(page)).toBe(document.activeElement)
    expect(text).toMatchSnapshot()
  })

  it('launches a visit using the on-screen keypad', async () => {
    const page = await mountCounter()
    for (const digit of phones.joao) {
      const key = page.findAll('button[type="button"]').find((button) => button.text() === digit)
      if (!key) throw new Error(`keypad key ${digit} missing`)
      await key.trigger('click')
    }
    expect(phoneInput(page).value).toBe('(67) 90000-0002')
    await page.find('button[type="submit"]').trigger('click')
    await vi.waitFor(() => expect(visibleText(page)).toContain(t('counter.todayCount', { count: 4 }, 4)))
    expect(visibleText(page)).toContain('(67) 9••••-0002')
  })

  it('removes the last digit with the keypad backspace', async () => {
    const page = await mountCounter()
    await typeInto(phoneInput(page), '6790')
    await page.find(`button[aria-label="${t('counter.launch.keypadBackspace')}"]`).trigger('click')
    expect(phoneInput(page).value).toBe('(67) 9')
  })

  it('registers a new customer on the spot', async () => {
    const page = await mountCounter()
    await typeInto(phoneInput(page), phones.cafeMerchant)
    await submitForm(page)
    await vi.waitFor(() => expect(visibleText(page)).toContain('(67) 9••••-0011'))
    expect(visibleText(page)).toContain(t('counter.ledger.newCustomer'))
  })

  it('rejects an invalid phone with a message and puts the focus back on the phone field', async () => {
    const page = await mountCounter()
    const other = document.createElement('button')
    document.body.append(other)
    other.focus()
    await typeInto(phoneInput(page), '679')
    await submitForm(page)
    await vi.waitFor(() => expect(visibleText(page)).toContain(t('errors.invalidPhone')))
    expect(phoneInput(page)).toBe(document.activeElement)
    expect(phoneInput(page).getAttribute('aria-invalid')).toBe('true')
  })

  it('clears the phone with Esc and keeps the focus on it', async () => {
    const page = await mountCounter()
    await typeInto(phoneInput(page), '6790')
    await phoneInput(page).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()
    expect(phoneInput(page).value).toBe('')
    expect(phoneInput(page)).toBe(document.activeElement)
  })
})

describe('counter page: amount mode', () => {
  beforeEach(() => {
    resetWorld({ merchant: cafeSession })
  })

  it('moves the focus to the amount when Enter is pressed with the amount still empty', async () => {
    const page = await mountCounter()
    await typeInto(phoneInput(page), phones.joao)
    await submitForm(page)
    await flushPromises()
    const amount = page.find('input[inputmode="none"]:not([type="tel"])').element
    expect(amount).toBe(document.activeElement)
    expect(visibleText(page)).not.toContain(t('errors.invalidAmount'))
  })

  it('launches the amount and clears both fields', async () => {
    const page = await mountCounter()
    await typeInto(phoneInput(page), phones.joao)
    await submitForm(page)
    await flushPromises()
    const amount = page.find('input[inputmode="none"]:not([type="tel"])').element
    if (!(amount instanceof HTMLInputElement)) throw new Error('amount input missing')
    await typeInto(amount, '2500')
    expect(amount.value).toContain('25,00')
    await submitForm(page)
    await vi.waitFor(() => expect(visibleText(page)).toContain('(67) 9••••-0002'))
    expect(phoneInput(page).value).toBe('')
    expect(amount.value).toBe('')
    expect(phoneInput(page)).toBe(document.activeElement)
  })

  it('asks for an amount when it is missing and the amount field already has the focus', async () => {
    const page = await mountCounter()
    await typeInto(phoneInput(page), phones.joao)
    await submitForm(page)
    await flushPromises()
    await submitForm(page)
    await vi.waitFor(() => expect(visibleText(page)).toContain(t('errors.invalidAmount')))
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
    await typeInto(phoneInput(page), phones.joao)
    await submitForm(page)
    await vi.waitFor(() => expect(navigateToMock).toHaveBeenCalledWith('/balcao/entrar', { replace: true }))
    expect(useMerchantSessionStore().merchant).toBeNull()
  })

  it('refreshes the shop status when the shop is still pending approval', async () => {
    resetWorld({ merchant: gymSession })
    const page = await mountCounter()
    await typeInto(phoneInput(page), phones.joao)
    await submitForm(page)
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
    await typeInto(phoneInput(page), phones.joao)
    await submitForm(page)
    await vi.waitFor(() => expect(refreshShopStatusMock).toHaveBeenCalled())
    expect(navigateToMock).not.toHaveBeenCalled()
  })
})
