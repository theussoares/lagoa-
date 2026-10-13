import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ActionButton from '../app/components/ActionButton.vue'
import type { ActionRole } from '../app/types/action'

const CLASS_BY_ROLE: Record<ActionRole, string> = {
  primary: 'bg-primary',
  reward: 'bg-secondary',
  secondary: 'ring-accented',
  quiet: 'hover:bg-elevated',
  danger: 'ring-error',
  dangerConfirm: 'bg-error',
  inline: 'text-primary',
}

async function render(props: { role: ActionRole } & Record<string, unknown>) {
  return mountSuspended(ActionButton, { props: { label: 'Ação', ...props } })
}

describe('ActionButton', () => {
  it.each(Object.entries(CLASS_BY_ROLE) as [ActionRole, string][])('role %s renders its look', async (role, token) => {
    const button = await render({ role })
    expect(button.get('button').classes().join(' ')).toContain(token)
  })

  it('is large by default and extra large for primary and reward', async () => {
    expect((await render({ role: 'secondary' })).get('button').classes()).toContain('min-h-12')
    expect((await render({ role: 'primary' })).get('button').classes()).toContain('min-h-14')
    expect((await render({ role: 'reward' })).get('button').classes()).toContain('min-h-14')
  })

  it('lets a screen raise the size of a secondary action', async () => {
    expect((await render({ role: 'secondary', size: 'xl' })).get('button').classes()).toContain('min-h-14')
  })

  it('uses a white focus ring on dark surfaces and keeps the theme ring otherwise', async () => {
    const dark = await render({ role: 'primary', surface: 'dark' })
    expect(dark.get('button').classes()).toContain('focus-visible:outline-white')
    const light = await render({ role: 'primary' })
    expect(light.get('button').classes()).not.toContain('focus-visible:outline-white')
  })

  it('passes loading and disabled to the button so it cannot be pressed twice', async () => {
    const loading = await render({ role: 'primary', loading: true })
    expect(loading.get('button').attributes('disabled')).toBeDefined()
    const disabled = await render({ role: 'quiet', disabled: true })
    expect(disabled.get('button').attributes('disabled')).toBeDefined()
  })

  it('renders a link when given a destination and forwards clicks otherwise', async () => {
    const link = await render({ role: 'primary', to: '/carteira' })
    expect(link.get('a').attributes('href')).toBe('/carteira')
    let clicks = 0
    const button = await render({ role: 'secondary', onClick: () => (clicks += 1) })
    await button.get('button').trigger('click')
    expect(clicks).toBe(1)
  })
})
