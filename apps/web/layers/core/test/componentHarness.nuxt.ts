import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import type { Component } from 'vue'

const mounted: VueWrapper[] = []

/** Monta o componente no documento, para foco e `aria-*` valerem como no navegador. Desmonte com `unmountAll`. */
export async function mountComponent(component: Component, props: Record<string, unknown> = {}): Promise<VueWrapper> {
  const wrapper = await mountSuspended(component, { props, attachTo: document.body })
  mounted.push(wrapper)
  await flushPromises()
  return wrapper
}

export function unmountAll(): void {
  for (const wrapper of mounted.splice(0)) {
    if (!wrapper.vm.$.isUnmounted) wrapper.unmount()
  }
  document.body.innerHTML = ''
}
