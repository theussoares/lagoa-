import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import App from '~/app.vue'
import { useNuxtApp, useRouter } from '#imports'
import { EXAMPLE_IDS } from '#layers/core/app/mock'
import { resetWorld, restoreClock, typeInto, visibleText } from '#layers/core/test/pageHarness.nuxt'
import { useMerchantSessionStore } from '#layers/merchant/app/stores/merchantSession'
import { useClubSetupStore } from '../app/stores/clubSetup'

const CLUB_SETUP_ROUTE = '/balcao/criar-clube'
const MERCHANT_SIGN_IN_ROUTE = '/balcao/entrar'
const PANEL_ROUTE = '/painel'

let wrapper: VueWrapper | undefined

function t(key: string, named?: Record<string, unknown>): string {
  return useNuxtApp().$i18n.t(key, named ?? {})
}

/** Celular confirmado sem loja: o login do mock devolve o ticket do cadastro. */
async function beginSignUp(): Promise<void> {
  const { $merchantAuth, $mockBackend } = useNuxtApp()
  const phone = EXAMPLE_IDS.phones.lucas
  await $merchantAuth.requestLoginCode(phone)
  const result = await $merchantAuth.signInMerchant(phone, $mockBackend.loginCode)
  if (!result.ok || result.value.kind !== 'signUp') throw new Error('expected a sign-up ticket')
  useClubSetupStore().begin(result.value.ticket, result.value.expiresAt)
}

async function mountSetup(): Promise<VueWrapper> {
  wrapper = await mountSuspended(App, { route: CLUB_SETUP_ROUTE, attachTo: document.body })
  await flushPromises()
  return wrapper
}

function field(page: VueWrapper, name: string): HTMLInputElement {
  const input = page.find(`form input[name="${name}"]`).element
  if (!(input instanceof HTMLInputElement)) throw new Error(`field ${name} missing`)
  return input
}

async function submit(page: VueWrapper): Promise<void> {
  await page.find('form').trigger('submit')
  await flushPromises()
}

async function fillShop(page: VueWrapper): Promise<void> {
  await typeInto(field(page, 'name'), 'Lava-jato Brilho')
  await typeInto(field(page, 'neighborhood'), 'Centro')
  await typeInto(field(page, 'addressLine'), 'Rua de exemplo, 100')
  // O seletor de tipo (reka-ui Select) não abre em happy-dom: a escolha entra pelo rascunho guardado.
  useClubSetupStore().form.shop.category = 'other'
  await flushPromises()
}

async function advanceToReward(page: VueWrapper): Promise<void> {
  await fillShop(page)
  await submit(page)
  await submit(page)
}

async function createClub(page: VueWrapper): Promise<void> {
  await advanceToReward(page)
  await typeInto(field(page, 'rewardTitle'), 'Lavagem simples grátis')
  await submit(page)
  await vi.waitFor(() => expect(visibleText(page)).toContain(t('clubSetup.poster.title')))
}

/** happy-dom não traz `window.confirm`: o teste instala um espião e responde por quem clica. */
function stubConfirm(answer: boolean): ReturnType<typeof vi.fn<(message?: string) => boolean>> {
  const confirm = vi.fn<(message?: string) => boolean>(() => answer)
  Object.defineProperty(window, 'confirm', { configurable: true, writable: true, value: confirm })
  return confirm
}

function headingText(): string | undefined {
  return document.querySelector('h1')?.textContent ?? undefined
}

beforeEach(async () => {
  resetWorld()
  useClubSetupStore().finish()
  await beginSignUp()
  await useRouter().replace('/')
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
  Reflect.deleteProperty(window, 'confirm')
  restoreClock()
})

describe('club setup page: steps', () => {
  it('starts on the shop step', async () => {
    const page = await mountSetup()
    expect(headingText()).toBe(t('clubSetup.shop.title'))
    expect(visibleText(page)).toMatchSnapshot()
  })

  it('moves the focus to the first invalid field when continuing without filling the shop', async () => {
    const page = await mountSetup()
    await submit(page)
    const invalid = document.querySelector('form [aria-invalid="true"]')
    expect(invalid).not.toBeNull()
    expect(document.activeElement).toBe(invalid)
    expect(document.activeElement).toBe(field(page, 'name'))
    expect(headingText()).toBe(t('clubSetup.shop.title'))
  })

  it('goes through every step and focuses the new title each time', async () => {
    const page = await mountSetup()
    await fillShop(page)
    await submit(page)
    await vi.waitFor(() => expect(document.activeElement).toBe(document.querySelector('h1')))
    expect(headingText()).toBe(t('clubSetup.rules.title'))
    expect(visibleText(page)).toMatchSnapshot()
    await submit(page)
    await vi.waitFor(() => expect(headingText()).toBe(t('clubSetup.reward.title')))
    expect(document.activeElement).toBe(document.querySelector('h1'))
  })

  it('moves the focus to the reward title when creating without one', async () => {
    const page = await mountSetup()
    await advanceToReward(page)
    await submit(page)
    await vi.waitFor(() => expect(document.activeElement).toBe(field(page, 'rewardTitle')))
    expect(headingText()).toBe(t('clubSetup.reward.title'))
  })

  it('goes back a step keeping what was typed', async () => {
    const page = await mountSetup()
    await fillShop(page)
    await submit(page)
    const back = page.findAll('button').find((button) => button.text() === t('clubSetup.back'))
    if (!back) throw new Error('back button missing')
    await back.trigger('click')
    await flushPromises()
    expect(headingText()).toBe(t('clubSetup.shop.title'))
    expect(field(page, 'name').value).toBe('Lava-jato Brilho')
  })
})

describe('club setup page: creating the club', () => {
  it('creates the club and shows the poster step', async () => {
    const page = await mountSetup()
    await createClub(page)
    expect(page.find('form').exists()).toBe(false)
    expect(visibleText(page)).toContain(t('merchantNav.pending.title'))
    expect(visibleText(page)).toContain(t('clubSetup.poster.print'))
    expect(useMerchantSessionStore().merchant).toMatchObject({ shopName: 'Lava-jato Brilho', shopStatus: 'pending' })
  })

  it('shows the sign-up expired error when the ticket is gone', async () => {
    const page = await mountSetup()
    await advanceToReward(page)
    await typeInto(field(page, 'rewardTitle'), 'Lavagem simples grátis')
    useClubSetupStore().ticket = null
    await submit(page)
    await vi.waitFor(() => expect(visibleText(page)).toContain(t('errors.signUpExpired')))
  })
})

describe('club setup page: leaving', () => {
  it('asks for confirmation before leaving with an unsaved draft and stays when declined', async () => {
    const confirm = stubConfirm(false)
    await mountSetup()
    await useRouter().push(PANEL_ROUTE)
    expect(confirm).toHaveBeenCalledWith(t('clubSetup.leaveConfirm'))
    expect(useRouter().currentRoute.value.path).toBe(CLUB_SETUP_ROUTE)
  })

  it('leaves when the confirmation is accepted', async () => {
    const confirm = stubConfirm(true)
    await mountSetup()
    await useRouter().push(PANEL_ROUTE)
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(useRouter().currentRoute.value.path).not.toBe(CLUB_SETUP_ROUTE)
  })

  it('does not ask when going to the merchant sign-in page', async () => {
    const confirm = stubConfirm(false)
    await mountSetup()
    await useRouter().push(MERCHANT_SIGN_IN_ROUTE)
    expect(confirm).not.toHaveBeenCalled()
    expect(useRouter().currentRoute.value.path).toBe(MERCHANT_SIGN_IN_ROUTE)
  })

  it('does not ask once the poster is showing', async () => {
    const confirm = stubConfirm(false)
    const page = await mountSetup()
    await createClub(page)
    await useRouter().push(PANEL_ROUTE)
    expect(confirm).not.toHaveBeenCalled()
    expect(useRouter().currentRoute.value.path).toBe(PANEL_ROUTE)
  })

  it('warns on page unload only while the draft is unsaved', async () => {
    const page = await mountSetup()
    const beforePoster = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(beforePoster)
    expect(beforePoster.defaultPrevented).toBe(true)

    await createClub(page)
    const afterPoster = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(afterPoster)
    expect(afterPoster.defaultPrevented).toBe(false)
  })
})
