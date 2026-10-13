import { afterEach, describe, expect, it } from 'vitest'
import { mountComponent, unmountAll } from '#layers/core/test/componentHarness.nuxt'
import ShopCard from '../app/components/ShopCard.vue'
import type { ShopTeaserModel } from '../app/types/discover'

afterEach(unmountAll)

const shop = (contact: ShopTeaserModel['contact']): ShopTeaserModel => ({
  id: 'shop_a',
  shopName: 'Barbearia Navalha',
  place: 'Centro',
  icon: 'i-ph-scissors',
  tilt: 0,
  rule: '10 carimbos = Corte grátis',
  earn: '1 carimbo por visita',
  welcome: null,
  preview: { kind: 'slots', total: 10, welcome: 0 },
  tag: null,
  showcase: { image: null, logo: null, rating: null, distance: null, openLabel: null },
  directions: { label: 'Como chegar', accessibleLabel: 'Como chegar: Barbearia Navalha', href: 'https://maps.example/x' },
  contact,
})

describe('ShopCard WhatsApp button', () => {
  it('opens the shop WhatsApp in a new tab with the text the shop chose', async () => {
    const page = await mountComponent(ShopCard, {
      shop: shop({ label: 'Agendar agora', accessibleLabel: 'Agendar agora: Barbearia Navalha (abre o WhatsApp)', href: 'https://wa.me/5567991234567' }),
    })
    const link = page.get('a[href="https://wa.me/5567991234567"]')
    expect(link.text()).toBe('Agendar agora')
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toContain('noopener')
    expect(link.attributes('aria-label')).toBe('Agendar agora: Barbearia Navalha (abre o WhatsApp)')
  })

  it('has no WhatsApp button when the shop did not register a number, and keeps the map link', async () => {
    const page = await mountComponent(ShopCard, { shop: shop(null) })
    expect(page.find('a[href^="https://wa.me/"]').exists()).toBe(false)
    expect(page.find('a[href="https://maps.example/x"]').exists()).toBe(true)
  })
})
