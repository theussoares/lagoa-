import { afterEach, describe, expect, it } from 'vitest'
import { mountComponent, unmountAll } from '#layers/core/test/componentHarness.nuxt'
import WalletProblem from '../app/components/wallet/Problem.vue'
import WalletEmpty from '../app/components/wallet/Empty.vue'
import HistorySection from '../app/components/rewards/HistorySection.vue'
import KnownShops from '../app/components/discover/KnownShops.vue'

afterEach(unmountAll)

describe('action roles outside check-in and profile', () => {
  it('retry on a wallet problem is the primary action of the card', async () => {
    const page = await mountComponent(WalletProblem, { message: 'Sem conexão', action: 'Tentar de novo' })
    expect(page.get('button').classes()).toContain('bg-primary')
  })

  it('the empty wallet leads to the shops with the primary action', async () => {
    const page = await mountComponent(WalletEmpty, { title: 't', lead: 'l', action: 'Ver lojas da rede', to: '/descobrir' })
    expect(page.get('a').classes()).toContain('bg-primary')
    expect(page.get('a').attributes('href')).toBe('/descobrir')
  })

  it('retry on the rewards history error is primary and emits retry', async () => {
    const page = await mountComponent(HistorySection, { status: 'error', entries: [], errorCode: 'network' })
    const retry = page.get('button')
    expect(retry.classes()).toContain('bg-primary')
    await retry.trigger('click')
    expect(page.emitted('retry')).toHaveLength(1)
  })

  it('"Ver carteira" in Discover is a quiet link to the wallet', async () => {
    const shop = { id: 's1', shopName: 'Loja', icon: 'i-ph-scissors', tilt: 1, rule: 'r', showcase: { photoUrl: null } }
    const page = await mountComponent(KnownShops, { shops: [shop] as never })
    const link = page.findAll('a').find((a) => a.text() === 'Ver carteira')
    expect(link?.classes()).toContain('hover:bg-elevated')
    expect(link?.attributes('href')).toBe('/carteira')
  })
})
