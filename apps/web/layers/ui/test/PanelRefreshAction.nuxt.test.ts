import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import PanelRefreshAction from '../app/components/PanelRefreshAction.vue'

describe('PanelRefreshAction', () => {
  it('shows the count and a named refresh button', async () => {
    const wrapper = await mountSuspended(PanelRefreshAction, { props: { countText: '12 clientes', loading: false, label: 'Atualizar lista' } })
    expect(wrapper.text()).toContain('12 clientes')
    expect(wrapper.get('button').attributes('aria-label')).toBe('Atualizar lista')
  })

  it('omits the count when there is none', async () => {
    const wrapper = await mountSuspended(PanelRefreshAction, { props: { loading: false, label: 'Atualizar lista' } })
    expect(wrapper.text()).toBe('')
  })

  it('emits refresh when the button is pressed', async () => {
    const wrapper = await mountSuspended(PanelRefreshAction, { props: { loading: false, label: 'Atualizar lista' } })
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('refresh')).toHaveLength(1)
  })

  it('keeps a touch target of at least 44px', async () => {
    const wrapper = await mountSuspended(PanelRefreshAction, { props: { loading: false, label: 'Atualizar lista' } })
    expect(wrapper.get('button').classes()).toContain('size-11')
  })

  it('disables the button while loading so it cannot be pressed twice', async () => {
    const wrapper = await mountSuspended(PanelRefreshAction, { props: { loading: true, label: 'Atualizar lista' } })
    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
  })
})
