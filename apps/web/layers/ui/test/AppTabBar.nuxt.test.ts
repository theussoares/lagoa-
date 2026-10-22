import { afterEach, describe, expect, it, vi } from 'vitest'
import { mountComponent, unmountAll } from '#layers/core/test/componentHarness.nuxt'
import type { TabBarItem, TabBarLinkItem } from '../app/types/wallet'
import AppTabBar from '../app/components/AppTabBar.vue'

afterEach(unmountAll)

const action: TabBarLinkItem = { to: '/check-in', label: 'Carimbar', icon: 'i-ph-qr-code-bold', activeIcon: 'i-ph-qr-code-bold' }

function link(to: string, label: string): TabBarLinkItem {
  return { to, label, icon: 'i-ph-circle', activeIcon: 'i-ph-circle-fill' }
}

describe('AppTabBar', () => {
  it('draws items without a kind as links, marking the current one', async () => {
    const items: [TabBarItem, TabBarItem, TabBarItem, TabBarItem] = [link('/a', 'A'), link('/b', 'B'), link('/c', 'C'), link('/d', 'D')]
    const bar = await mountComponent(AppTabBar, { items, action, label: 'Navegação', currentPath: '/b' })
    const hrefs = bar.findAll('a').map((anchor) => anchor.attributes('href'))
    expect(hrefs).toEqual(['/a', '/b', '/check-in', '/c', '/d'])
    expect(bar.findAll('a[aria-current="page"]').map((anchor) => anchor.text())).toEqual(['B'])
    expect(bar.find('button').exists()).toBe(false)
  })

  it('draws a button item as a real button that opens a dialog', async () => {
    const onSelect = vi.fn()
    const more: TabBarItem = { kind: 'button', label: 'Mais', icon: 'i-ph-dots-three-outline', activeIcon: 'i-ph-dots-three-outline-fill', onSelect }
    const items: [TabBarItem, TabBarItem, TabBarItem, TabBarItem] = [link('/a', 'A'), link('/b', 'B'), { kind: 'link', ...link('/c', 'C') }, more]
    const bar = await mountComponent(AppTabBar, { items, action, label: 'Navegação', currentPath: '/a' })
    const button = bar.get('button')
    expect(button.attributes('type')).toBe('button')
    expect(button.attributes('aria-haspopup')).toBe('dialog')
    expect(button.attributes('aria-expanded')).toBe('false')
    expect(button.text()).toBe('Mais')
    expect(bar.findAll('a')).toHaveLength(4)
    await button.trigger('click')
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('says the button is expanded while its dialog is open', async () => {
    const more: TabBarItem = { kind: 'button', label: 'Mais', icon: 'i-ph-x', activeIcon: 'i-ph-x-bold', onSelect: () => {}, expanded: true }
    const items: [TabBarItem, TabBarItem, TabBarItem, TabBarItem] = [link('/a', 'A'), link('/b', 'B'), link('/c', 'C'), more]
    const bar = await mountComponent(AppTabBar, { items, action, label: 'Navegação', currentPath: '/a' })
    expect(bar.get('button').attributes('aria-expanded')).toBe('true')
  })
})
