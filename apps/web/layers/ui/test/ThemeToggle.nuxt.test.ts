import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ThemeToggle from '../app/components/ThemeToggle.vue'
import { useThemePreference } from '../app/composables/useThemePreference'

describe('ThemeToggle', () => {
  it('renders a button with type="button" and accessible label', async () => {
    const wrapper = await mountSuspended(ThemeToggle)
    const button = wrapper.find('button')
    expect(button.exists()).toBe(true)
    expect(button.attributes('type')).toBe('button')
    expect(button.attributes('aria-label')).toBeDefined()
    expect(button.attributes('title')).toBeDefined()
  })

  it('contains both moon and sun Phosphor icons with aria-hidden="true"', async () => {
    const wrapper = await mountSuspended(ThemeToggle)
    const icons = wrapper.findAllComponents({ name: 'UIcon' })
    expect(icons.length).toBe(2)

    const moon = icons.find((icon) => icon.props('name') === 'i-ph-moon')
    const sun = icons.find((icon) => icon.props('name') === 'i-ph-sun')

    expect(moon).toBeDefined()
    expect(sun).toBeDefined()
    expect(moon?.attributes('aria-hidden')).toBe('true')
    expect(sun?.attributes('aria-hidden')).toBe('true')
    expect(moon?.classes()).toContain('dark:inline-block')
    expect(sun?.classes()).toContain('dark:hidden')
  })

  it('toggles theme preference when clicked', async () => {
    const theme = useThemePreference()
    const initialTheme = theme.value
    const expectedToggledTheme = initialTheme === 'dark' ? 'light' : 'dark'

    const wrapper = await mountSuspended(ThemeToggle)
    const button = wrapper.find('button')
    await button.trigger('click')

    expect(theme.value).toBe(expectedToggledTheme)

    // Toggle back to original
    await button.trigger('click')
    expect(theme.value).toBe(initialTheme)
  })

  it('keeps a touch target size of at least 36px and includes focus ring', async () => {
    const wrapper = await mountSuspended(ThemeToggle)
    const classes = wrapper.get('button').classes()
    expect(classes).toContain('size-9')
    expect(classes).toContain('focus-visible:outline-2')
    expect(classes).toContain('print:hidden')
  })
})
