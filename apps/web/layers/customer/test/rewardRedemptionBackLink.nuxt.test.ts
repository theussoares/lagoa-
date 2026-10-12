import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import BackLink from '../app/components/reward-redemption/BackLink.vue'

describe('RewardRedemptionBackLink', () => {
  it('is a named 44px link whose keyboard focus shows over the dark strip', async () => {
    const link = await mountSuspended(BackLink, { props: { to: '/premios', label: 'Voltar para Prêmios' } })
    expect(link.attributes('aria-label')).toBe('Voltar para Prêmios')
    expect(link.classes()).toContain('size-11')
    expect(link.classes()).toContain('focus-visible:outline-white')
  })
})
