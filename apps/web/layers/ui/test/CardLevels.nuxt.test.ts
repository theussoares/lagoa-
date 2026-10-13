import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import HeroCard from '../app/components/HeroCard.vue'
import RewardCoupon from '../app/components/RewardCoupon.vue'

describe('card levels', () => {
  it('a card that is a link is a tappable card', async () => {
    const coupon = await mountSuspended(RewardCoupon, {
      props: { reward: { to: '/premios/c1', shopName: 'Loja', rewardName: 'Prêmio' } as never, action: 'Resgatar prêmio' },
    })
    expect(coupon.get('a').classes()).toContain('card-tap')
  })

  it('the lead card of a screen is a raised card', async () => {
    const hero = await mountSuspended(HeroCard, {
      props: { badge: 'Desafio', title: 'Visite 3 lojas', description: 'd', progress: '0 de 3', filled: 0, total: 3 },
    })
    expect(hero.get('article').classes()).toContain('card-raised')
  })
})
