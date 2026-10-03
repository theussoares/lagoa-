import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent, nextTick, shallowRef } from 'vue'
import type { ShallowRef } from 'vue'
import type { ErrorCarrier } from '#layers/core/app/types/error'
import { useCustomerSessionGuard } from '../app/composables/useCustomerSessionGuard'

const { signOutMock } = vi.hoisted(() => ({ signOutMock: vi.fn() }))
mockNuxtImport('useCustomerSession', () => () => ({ session: { value: null }, start: vi.fn(), signOut: signOutMock }))

const SUCCESS: ErrorCarrier = { status: 'success' }
const PENDING: ErrorCarrier = { status: 'pending' }
const unauthorized: ErrorCarrier = { status: 'error', error: { code: 'unauthorized' } }

async function mountGuard(sources: ShallowRef<ErrorCarrier>[]): Promise<void> {
  await mountSuspended(
    defineComponent({
      setup() {
        useCustomerSessionGuard(() => sources.map((source) => source.value))
        return () => null
      },
    }),
  )
}

async function set(source: ShallowRef<ErrorCarrier>, state: ErrorCarrier): Promise<void> {
  source.value = state
  await nextTick()
}

describe('useCustomerSessionGuard', () => {
  const logs = [vi.spyOn(console, 'log'), vi.spyOn(console, 'warn'), vi.spyOn(console, 'error')]

  beforeEach(() => {
    signOutMock.mockReset()
    logs.forEach((spy) => spy.mockClear())
  })

  it('signs out when any source turns unauthorized', async () => {
    const a = shallowRef<ErrorCarrier>(SUCCESS)
    const b = shallowRef<ErrorCarrier>(SUCCESS)
    await mountGuard([a, b])
    await set(b, unauthorized)
    expect(signOutMock).toHaveBeenCalledTimes(1)
  })

  it('signs out again when unauthorized returns through pending', async () => {
    const a = shallowRef<ErrorCarrier>(SUCCESS)
    await mountGuard([a])
    await set(a, unauthorized)
    await set(a, PENDING)
    await set(a, unauthorized)
    expect(signOutMock).toHaveBeenCalledTimes(2)
  })

  it('does not sign out again while a source stays unauthorized and another one changes', async () => {
    const a = shallowRef<ErrorCarrier>(SUCCESS)
    const b = shallowRef<ErrorCarrier>(SUCCESS)
    await mountGuard([a, b])
    await set(a, unauthorized)
    await set(b, PENDING)
    await set(b, SUCCESS)
    expect(signOutMock).toHaveBeenCalledTimes(1)
  })

  it('ignores other errors and logs nothing', async () => {
    const a = shallowRef<ErrorCarrier>(SUCCESS)
    await mountGuard([a])
    await set(a, { status: 'error', code: 'invalidPhone' })
    expect(signOutMock).not.toHaveBeenCalled()
    logs.forEach((spy) => expect(spy).not.toHaveBeenCalled())
  })
})
