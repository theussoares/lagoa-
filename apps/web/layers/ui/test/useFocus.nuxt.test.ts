import { afterEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { focusFirstInput, focusFirstMatching, useFocusRequest, useFocusTarget } from '../app/composables/useFocus'

let wrapper: VueWrapper | undefined

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
})

describe('useFocusRequest', () => {
  it('starts without a request and carries only the target and an id', () => {
    const { request, focus } = useFocusRequest<'phone' | 'code'>()
    expect(request.value).toBeNull()
    focus('phone')
    expect(request.value).toEqual({ target: 'phone', id: 1 })
  })

  it('gives a new id when the same target is requested twice', () => {
    const { request, focus } = useFocusRequest<'phone'>()
    focus('phone')
    const first = request.value?.id
    focus('phone')
    expect(request.value?.id).not.toBe(first)
  })
})

describe('useFocusTarget', () => {
  it('runs the focus callback only for its own target, after the DOM update', async () => {
    const { request, focus } = useFocusRequest<'phone' | 'code'>()
    const onFocus = vi.fn()
    wrapper = await mountSuspended(
      defineComponent({
        setup() {
          useFocusTarget(() => request.value, 'phone', onFocus)
          return () => h('div')
        },
      }),
    )

    focus('code')
    await nextTick()
    expect(onFocus).not.toHaveBeenCalled()

    focus('phone')
    await nextTick()
    expect(onFocus).toHaveBeenCalledTimes(1)

    focus('phone')
    await nextTick()
    expect(onFocus).toHaveBeenCalledTimes(2)
  })
})

describe('focusFirstInput', () => {
  it('focuses the first input inside an element', () => {
    const root = document.createElement('div')
    root.innerHTML = '<span></span><input id="first"><input id="second">'
    document.body.append(root)
    focusFirstInput(root)
    expect(document.activeElement?.id).toBe('first')
    root.remove()
  })

  it('accepts a component instance and reads its root element', () => {
    const root = document.createElement('div')
    root.innerHTML = '<input id="inside">'
    document.body.append(root)
    focusFirstInput({ $el: root })
    expect(document.activeElement?.id).toBe('inside')
    root.remove()
  })

  it('ignores null and values that are not elements', () => {
    expect(() => focusFirstInput(null)).not.toThrow()
    expect(() => focusFirstInput({ $el: 'text' })).not.toThrow()
  })
})

describe('focusFirstMatching', () => {
  it('focuses the first element that matches the selector', () => {
    const root = document.createElement('div')
    root.innerHTML = '<input id="valid"><input id="invalid" aria-invalid="true"><input id="invalid-2" aria-invalid="true">'
    document.body.append(root)
    focusFirstMatching('[aria-invalid="true"]')
    expect(document.activeElement?.id).toBe('invalid')
    root.remove()
  })

  it('does nothing when no element matches', () => {
    expect(() => focusFirstMatching('#does-not-exist')).not.toThrow()
  })
})
