import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import InlineStatus from '../app/components/InlineStatus.vue'

describe('InlineStatus', () => {
  it('renders the success text in the success color', async () => {
    const wrapper = await mountSuspended(InlineStatus, { props: { tone: 'success', text: 'Salvo.' } })
    expect(wrapper.text()).toBe('Salvo.')
    expect(wrapper.get('span').classes()).toContain('text-success')
    expect(wrapper.get('span').classes()).not.toContain('text-error')
  })

  it('renders the error text in the error color', async () => {
    const wrapper = await mountSuspended(InlineStatus, { props: { tone: 'error', text: 'Não foi possível salvar.' } })
    expect(wrapper.get('span').classes()).toContain('text-error')
  })

  it('does not announce by itself: the aria-live container belongs to the parent', async () => {
    const wrapper = await mountSuspended(InlineStatus, { props: { tone: 'success', text: 'Salvo.' } })
    expect(wrapper.find('[aria-live]').exists()).toBe(false)
    expect(wrapper.get('span').attributes('aria-live')).toBeUndefined()
    expect(wrapper.get('span').attributes('role')).toBeUndefined()
  })
})
