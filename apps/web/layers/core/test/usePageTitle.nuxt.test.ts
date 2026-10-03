import { afterEach, describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { useNuxtApp } from '#imports'
import { usePageTitle } from '../app/composables/usePageTitle'

let wrapper: VueWrapper | undefined

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
})

function t(key: string): string {
  return useNuxtApp().$i18n.t(key)
}

describe('usePageTitle', () => {
  it('sets the tab title to "<screen> · <app name>" from a translation key', async () => {
    wrapper = await mountSuspended(
      defineComponent({
        setup() {
          usePageTitle('wallet.title')
          return () => h('div')
        },
      }),
    )
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(document.title).toBe(`${t('wallet.title')} · ${t('app.name')}`)
  })
})
