import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ScreenHeader from '../app/components/ScreenHeader.vue'

describe('ScreenHeader', () => {
  it('renders the title as the single h1 with the lead below it', async () => {
    const wrapper = await mountSuspended(ScreenHeader, { props: { title: 'Olá, Ana', lead: 'Seus cartões' } })
    expect(wrapper.findAll('h1')).toHaveLength(1)
    expect(wrapper.get('h1').text()).toBe('Olá, Ana')
    expect(wrapper.text()).toContain('Seus cartões')
  })

  it('keeps a long title whole: it wraps instead of truncating', async () => {
    const title = 'Olá, Maria Fernanda Albuquerque de Souza Nascimento'
    const wrapper = await mountSuspended(ScreenHeader, { props: { title } })
    expect(wrapper.get('h1').text()).toBe(title)
    expect(wrapper.get('h1').classes()).not.toContain('truncate')
  })

  it('stays on the solid header color without a photo', async () => {
    const wrapper = await mountSuspended(ScreenHeader, { props: { title: 'Perfil' } })
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.get('header').classes()).toContain('bg-(--lagoa-header)')
  })

  it('draws the photo as decoration only', async () => {
    const wrapper = await mountSuspended(ScreenHeader, { props: { title: 'Perfil', image: '/example/city.svg' } })
    const image = wrapper.get('img')
    expect(image.attributes('alt')).toBe('')
    expect(image.attributes('src')).toBe('/example/city.svg')
  })

  it('renders the actions slot beside the title', async () => {
    const wrapper = await mountSuspended(ScreenHeader, {
      props: { title: 'Perfil' },
      slots: { actions: '<a href="/perfil" aria-label="Perfil">ir</a>' },
    })
    expect(wrapper.find('a[aria-label="Perfil"]').exists()).toBe(true)
  })

  it('keeps room for an overlapping card by default and drops it when told not to overlap', async () => {
    const overlapping = await mountSuspended(ScreenHeader, { props: { title: 'Perfil' } })
    expect(overlapping.get('header').classes()).toContain('pb-16')
    const flat = await mountSuspended(ScreenHeader, { props: { title: 'Prêmios', overlap: false } })
    expect(flat.get('header').classes()).not.toContain('pb-16')
    expect(flat.get('header').classes()).toContain('pb-6')
  })

  it('writes the lead in full white so it stays readable over a bright photo', async () => {
    const wrapper = await mountSuspended(ScreenHeader, { props: { title: 'Ranking', lead: 'Outubro', image: '/example/city.svg' } })
    const lead = wrapper.findAll('p').find((node) => node.text() === 'Outubro')
    expect(lead?.classes()).toContain('text-white')
    expect(lead?.classes()).not.toContain('text-white/90')
  })
})
