import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import StampImpression from '../app/components/StampImpression.vue'

describe('StampImpression', () => {
  it('uses the primary ink by default and the secondary one for a reward', async () => {
    const ink = await mountSuspended(StampImpression, { props: { icon: 'i-ph-scissors', tilt: 2 } })
    expect(ink.classes()).toContain('text-primary')
    const reward = await mountSuspended(StampImpression, { props: { icon: 'i-ph-gift', tilt: 2, tone: 'reward' } })
    expect(reward.classes()).toContain('text-secondary')
  })

  it('has a light tone for stamps pressed over a dark photo', async () => {
    const light = await mountSuspended(StampImpression, { props: { icon: 'i-ph-scissors', tilt: 2, tone: 'light' } })
    expect(light.classes()).toContain('text-white')
    expect(light.classes()).not.toContain('text-primary')
  })

  it('has a light reward tone that stays readable over the dark photo', async () => {
    const stamp = await mountSuspended(StampImpression, { props: { icon: 'i-ph-gift', tilt: 2, tone: 'rewardLight' } })
    expect(stamp.classes()).toContain('text-secondary-300')
    expect(stamp.classes()).not.toContain('text-secondary')
  })
})
