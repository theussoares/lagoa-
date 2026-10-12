import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import HeaderIconLink from '../app/components/HeaderIconLink.vue'

const props = { to: '/carteira', label: 'Voltar para a carteira', icon: 'i-ph-arrow-left' }

describe('HeaderIconLink', () => {
  it('is a real link named by its label', async () => {
    const link = await mountSuspended(HeaderIconLink, { props })
    expect(link.get('a').attributes('href')).toBe('/carteira')
    expect(link.get('a').attributes('aria-label')).toBe('Voltar para a carteira')
  })

  it('keeps a touch target of at least 44px and a white focus ring on the dark strip', async () => {
    const classes = (await mountSuspended(HeaderIconLink, { props })).get('a').classes()
    expect(classes).toContain('size-11')
    expect(classes).toContain('focus-visible:outline-white')
  })

  it('hides the icon from assistive tech and sizes it', async () => {
    const large = await mountSuspended(HeaderIconLink, { props: { ...props, iconSize: 'lg' } })
    const icon = large.get('a').element.firstElementChild
    expect(icon?.getAttribute('aria-hidden')).toBe('true')
    expect(icon?.classList.contains('size-7')).toBe(true)
  })
})
