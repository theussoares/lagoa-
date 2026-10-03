import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import type { RouteLocationNormalized } from 'vue-router'
import type { LeaveGuardOptions } from '../app/types/browser'
import { useLeaveGuard } from '../app/composables/useLeaveGuard'

type LeaveHook = (to: RouteLocationNormalized) => boolean | void

const router = vi.hoisted(() => ({ hook: undefined as ((to: { path: string }) => unknown) | undefined }))

// O guarda de rota depende do `RouterView` de uma página; aqui o gancho registrado é chamado à mão.
mockNuxtImport('onBeforeRouteLeave', () => (hook: (to: { path: string }) => unknown) => {
  router.hook = hook
})

const SIGN_IN = '/balcao/entrar'

let wrapper: VueWrapper | undefined

function stubConfirm(answer: boolean): ReturnType<typeof vi.fn<(message?: string) => boolean>> {
  const confirm = vi.fn<(message?: string) => boolean>(() => answer)
  Object.defineProperty(window, 'confirm', { configurable: true, writable: true, value: confirm })
  return confirm
}

async function mountGuarded(options: Partial<LeaveGuardOptions> = {}): Promise<void> {
  const Host = defineComponent({
    setup() {
      useLeaveGuard({ when: () => true, message: () => 'Sair perde o que foi preenchido.', warnOnUnload: false, ...options })
      return () => h('div')
    },
  })
  wrapper = await mountSuspended(Host)
}

function leave(path: string): unknown {
  const hook: LeaveHook | undefined = router.hook as LeaveHook | undefined
  if (hook === undefined) throw new Error('the guard did not register a route hook')
  return hook({ path } as RouteLocationNormalized)
}

function unloadEvent(): Event {
  const event = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(event)
  return event
}

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  router.hook = undefined
  Reflect.deleteProperty(window, 'confirm')
})

describe('useLeaveGuard: route changes', () => {
  it('asks with the given message and blocks the navigation when declined', async () => {
    const confirm = stubConfirm(false)
    await mountGuarded()
    expect(leave('/painel')).toBe(false)
    expect(confirm).toHaveBeenCalledWith('Sair perde o que foi preenchido.')
  })

  it('lets the navigation through when the confirmation is accepted', async () => {
    const confirm = stubConfirm(true)
    await mountGuarded()
    expect(leave('/painel')).toBe(true)
    expect(confirm).toHaveBeenCalledTimes(1)
  })

  it('does not ask when there is nothing to lose', async () => {
    const confirm = stubConfirm(false)
    await mountGuarded({ when: () => false })
    expect(leave('/painel')).toBe(true)
    expect(confirm).not.toHaveBeenCalled()
  })

  it('does not ask for destinations the page allows', async () => {
    const confirm = stubConfirm(false)
    await mountGuarded({ allow: (to) => to.path === SIGN_IN })
    expect(leave(SIGN_IN)).toBe(true)
    expect(confirm).not.toHaveBeenCalled()
  })

  it('reads the condition again on every navigation', async () => {
    const confirm = stubConfirm(true)
    let dirty = false
    await mountGuarded({ when: () => dirty })
    leave('/painel')
    expect(confirm).not.toHaveBeenCalled()
    dirty = true
    leave('/painel')
    expect(confirm).toHaveBeenCalledTimes(1)
  })
})

describe('useLeaveGuard: closing the tab', () => {
  it('blocks the unload while there is something to lose', async () => {
    await mountGuarded({ warnOnUnload: true })
    expect(unloadEvent().defaultPrevented).toBe(true)
  })

  it('lets the tab close when there is nothing to lose', async () => {
    await mountGuarded({ warnOnUnload: true, when: () => false })
    expect(unloadEvent().defaultPrevented).toBe(false)
  })

  it('never listens for unload when the page did not ask for it', async () => {
    await mountGuarded({ warnOnUnload: false })
    expect(unloadEvent().defaultPrevented).toBe(false)
  })

  it('stops listening after the page unmounts', async () => {
    await mountGuarded({ warnOnUnload: true })
    wrapper?.unmount()
    wrapper = undefined
    expect(unloadEvent().defaultPrevented).toBe(false)
  })
})
