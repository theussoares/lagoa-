import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { useNuxtApp } from '#imports'
import { anaSession } from '#layers/core/test/fixtures'
import { mountComposable } from '#layers/core/test/composableHarness.nuxt'
import { resetWorld, restoreClock } from '#layers/core/test/pageHarness.nuxt'
import InviteOpening from '../app/components/invite/Opening.vue'
import { useInviteScreen } from '../app/composables/useInviteScreen'

const { navigateToMock } = vi.hoisted(() => ({ navigateToMock: vi.fn() }))
mockNuxtImport('navigateTo', () => navigateToMock)

beforeEach(() => {
  resetWorld({ customer: anaSession })
  navigateToMock.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
  restoreClock()
})

/** O composable não devolve nada; o harness precisa de um valor. */
function openInvite(): true {
  useInviteScreen()
  return true
}

describe('useInviteScreen', () => {
  it('registers the invite and goes on to the shop check-in', async () => {
    const capture = vi.spyOn(useNuxtApp().$customerServices.referral, 'capture')
    await mountComposable(openInvite, { route: '/convite?ref=ABC123&loja=SHOP42' })
    await flushPromises()
    expect(capture).toHaveBeenCalledWith({ referralCode: 'ABC123', shopCode: 'SHOP42' })
    expect(navigateToMock).toHaveBeenCalledWith({ path: '/check-in', query: { loja: 'SHOP42' } }, { replace: true })
  })

  it('does not strand the friend when registering the invite fails', async () => {
    vi.spyOn(useNuxtApp().$customerServices.referral, 'capture').mockResolvedValue({ ok: false, error: { code: 'internal' } })
    await mountComposable(openInvite, { route: '/convite?ref=ABC123&loja=SHOP42' })
    await flushPromises()
    expect(navigateToMock).toHaveBeenCalledWith({ path: '/check-in', query: { loja: 'SHOP42' } }, { replace: true })
  })

  it('sends a broken link home without registering anything', async () => {
    const capture = vi.spyOn(useNuxtApp().$customerServices.referral, 'capture')
    await mountComposable(openInvite, { route: '/convite?loja=SHOP42' })
    await flushPromises()
    expect(capture).not.toHaveBeenCalled()
    expect(navigateToMock).toHaveBeenCalledWith('/carteira', { replace: true })
  })
})

describe('InviteOpening', () => {
  it('shows the city photo header with the only h1 and announces the message politely', async () => {
    const opening = await mountSuspended(InviteOpening, {
      props: { title: 'Convite', lead: 'Levando você à loja', image: '/city.webp', message: 'Abrindo o convite…' },
    })
    expect(opening.findAll('h1')).toHaveLength(1)
    expect(opening.get('img').attributes('alt')).toBe('')
    expect(opening.get('header').classes()).toContain('pb-6')
    expect(opening.get('[aria-live=polite]').text()).toBe('Abrindo o convite…')
  })
})
