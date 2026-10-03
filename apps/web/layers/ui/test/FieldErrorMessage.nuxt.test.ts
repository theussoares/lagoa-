import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import FieldErrorMessage from '../app/components/FieldErrorMessage.vue'

describe('FieldErrorMessage', () => {
  it('shows the message with a decorative warning icon', async () => {
    const wrapper = await mountSuspended(FieldErrorMessage, { props: { message: 'Celular incompleto.' } })
    expect(wrapper.text()).toBe('Celular incompleto.')
    expect(wrapper.find('[aria-hidden="true"]').exists()).toBe(true)
  })

  it('renders nothing without a message', async () => {
    const wrapper = await mountSuspended(FieldErrorMessage)
    expect(wrapper.text()).toBe('')
    expect(wrapper.find('span').exists()).toBe(false)
  })
})
