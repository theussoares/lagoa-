import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent, nextTick, shallowRef } from 'vue'
import type { ShallowRef } from 'vue'
import type { ErrorCarrier } from '#layers/core/app/types/error'
import type { MerchantSessionGuardOptions } from '../app/types/session'
import { useMerchantSessionGuard } from '../app/composables/useMerchantSessionGuard'

const { signOutMock, refreshMock } = vi.hoisted(() => ({ signOutMock: vi.fn(), refreshMock: vi.fn() }))
// Sessão recusada pelo servidor: o guard só esquece a sessão local (`expire`), não tenta sair de novo no servidor.
mockNuxtImport('useMerchantSession', () => () => ({ session: { value: null }, start: vi.fn(), signOut: vi.fn(), expire: signOutMock }))
mockNuxtImport('useShopStatus', () => () => ({ status: { value: 'approved' }, refresh: refreshMock, approveForTesting: null }))

const SUCCESS: ErrorCarrier = { status: 'success' }
const PENDING: ErrorCarrier = { status: 'pending' }
const failed = (code: 'unauthorized' | 'shopSuspended' | 'shopPendingApproval' | 'invalidPhone'): ErrorCarrier => ({
  status: 'error',
  code,
})
const failedWithResult = (code: 'unauthorized' | 'shopSuspended'): ErrorCarrier => ({ status: 'error', error: { code } })

async function mountGuard(sources: ShallowRef<ErrorCarrier>[], options?: MerchantSessionGuardOptions): Promise<void> {
  await mountSuspended(
    defineComponent({
      setup() {
        useMerchantSessionGuard(() => sources.map((source) => source.value), options)
        return () => null
      },
    }),
  )
}

async function set(source: ShallowRef<ErrorCarrier>, state: ErrorCarrier): Promise<void> {
  source.value = state
  await nextTick()
}

describe('useMerchantSessionGuard', () => {
  const logs = [vi.spyOn(console, 'log'), vi.spyOn(console, 'warn'), vi.spyOn(console, 'error')]

  beforeEach(() => {
    signOutMock.mockReset()
    refreshMock.mockReset()
    logs.forEach((spy) => spy.mockClear())
  })

  it('signs out when a source turns unauthorized (both error shapes)', async () => {
    const a = shallowRef<ErrorCarrier>(SUCCESS)
    const b = shallowRef<ErrorCarrier>(SUCCESS)
    await mountGuard([a, b])
    await set(a, failed('unauthorized'))
    expect(signOutMock).toHaveBeenCalledTimes(1)
    await set(a, SUCCESS)
    await set(b, failedWithResult('unauthorized'))
    expect(signOutMock).toHaveBeenCalledTimes(2)
  })

  it('refreshes the shop status when the shop is closed and refreshShopStatus is on', async () => {
    const a = shallowRef<ErrorCarrier>(SUCCESS)
    await mountGuard([a], { refreshShopStatus: true })
    await set(a, failed('shopSuspended'))
    await set(a, PENDING)
    await set(a, failed('shopPendingApproval'))
    expect(refreshMock).toHaveBeenCalledTimes(2)
    expect(signOutMock).not.toHaveBeenCalled()
  })

  it('refreshes again when the same code comes back through pending', async () => {
    const a = shallowRef<ErrorCarrier>(SUCCESS)
    await mountGuard([a], { refreshShopStatus: true })
    await set(a, failedWithResult('shopSuspended'))
    await set(a, PENDING)
    await set(a, failedWithResult('shopSuspended'))
    expect(refreshMock).toHaveBeenCalledTimes(2)
  })

  it('refreshes again when a second source fails with the same code while the first stays in error', async () => {
    const ledger = shallowRef<ErrorCarrier>(failed('shopSuspended'))
    const launch = shallowRef<ErrorCarrier>(SUCCESS)
    await mountGuard([ledger, launch], { refreshShopStatus: true })
    await set(launch, failed('shopSuspended'))
    expect(refreshMock).toHaveBeenCalledTimes(1)
    await set(launch, SUCCESS)
    refreshMock.mockClear()
    await set(launch, failed('shopSuspended'))
    expect(refreshMock).toHaveBeenCalledTimes(1)
  })

  it('only signs out when one source is unauthorized and another has the shop closed', async () => {
    const a = shallowRef<ErrorCarrier>(failed('shopSuspended'))
    const b = shallowRef<ErrorCarrier>(SUCCESS)
    await mountGuard([a, b], { refreshShopStatus: true })
    await set(b, failed('unauthorized'))
    expect(signOutMock).toHaveBeenCalledTimes(1)
    expect(refreshMock).not.toHaveBeenCalled()
  })

  it('does not refresh when refreshShopStatus is off, but still signs out', async () => {
    const a = shallowRef<ErrorCarrier>(SUCCESS)
    await mountGuard([a])
    await set(a, failed('shopSuspended'))
    expect(refreshMock).not.toHaveBeenCalled()
    await set(a, failed('unauthorized'))
    expect(signOutMock).toHaveBeenCalledTimes(1)
  })

  it('ignores other error codes and non-error states', async () => {
    const a = shallowRef<ErrorCarrier>(SUCCESS)
    await mountGuard([a], { refreshShopStatus: true })
    await set(a, failed('invalidPhone'))
    await set(a, PENDING)
    expect(signOutMock).not.toHaveBeenCalled()
    expect(refreshMock).not.toHaveBeenCalled()
  })

  it('logs nothing', async () => {
    const a = shallowRef<ErrorCarrier>(SUCCESS)
    await mountGuard([a], { refreshShopStatus: true })
    await set(a, failed('unauthorized'))
    await set(a, failed('shopSuspended'))
    logs.forEach((spy) => expect(spy).not.toHaveBeenCalled())
  })
  it('signs out again when a source stays unauthorized and another source changes', async () => {
    const a = shallowRef<ErrorCarrier>(SUCCESS)
    const b = shallowRef<ErrorCarrier>(SUCCESS)
    await mountGuard([a, b], { refreshShopStatus: true })
    await set(a, failed('unauthorized'))
    await set(b, PENDING)
    expect(signOutMock).toHaveBeenCalledTimes(2)
    expect(refreshMock).not.toHaveBeenCalled()
  })

  it('refreshes again when the shop stays closed and another source changes without error', async () => {
    const a = shallowRef<ErrorCarrier>(SUCCESS)
    const b = shallowRef<ErrorCarrier>(SUCCESS)
    await mountGuard([a, b], { refreshShopStatus: true })
    await set(a, failed('shopSuspended'))
    await set(b, PENDING)
    expect(refreshMock).toHaveBeenCalledTimes(2)
  })
})
