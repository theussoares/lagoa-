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
})
