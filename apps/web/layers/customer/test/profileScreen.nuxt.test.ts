import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { computed } from 'vue'
import { useNuxtApp } from '#imports'
import { anaSession } from '#layers/core/test/fixtures'
import { mountComposable } from '#layers/core/test/composableHarness.nuxt'
import { resetWorld, restoreClock } from '#layers/core/test/pageHarness.nuxt'
import { useBirthdayEditing } from '../app/composables/useBirthdayEditing'
import { useProfileScreen } from '../app/composables/useProfileScreen'

const { signOutMock, toastAdd } = vi.hoisted(() => ({ signOutMock: vi.fn(), toastAdd: vi.fn() }))

mockNuxtImport('useCustomerSession', () => () => ({ signOut: signOutMock }))
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))

beforeEach(() => {
  resetWorld({ customer: anaSession })
  signOutMock.mockReset()
  toastAdd.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
  restoreClock()
})

function services(): ReturnType<typeof useNuxtApp>['$customerServices'] {
  return useNuxtApp().$customerServices
}

describe('useProfileScreen', () => {
  it('loads the profile and signs out when the session is no longer valid', async () => {
    vi.spyOn(services().profile, 'getProfile').mockResolvedValue({ ok: false, error: { code: 'unauthorized' } })
    const { result } = await mountComposable(useProfileScreen)
    await flushPromises()
    expect(result.state.status).toBe('error')
    expect(signOutMock).toHaveBeenCalledTimes(1)
  })

  it('keeps the new profile and thanks the customer when the consent is saved', async () => {
    const { result } = await mountComposable(useProfileScreen)
    await result.changeConsent(true)
    expect(result.state.status === 'success' && result.state.value.consent.notifications).toBe(true)
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'success' }))
    expect(result.consentSaving).toBe(false)
  })

  it('warns and keeps the profile when saving the consent fails', async () => {
    const { result } = await mountComposable(useProfileScreen)
    const before = result.state
    vi.spyOn(services().profile, 'setNotificationConsent').mockResolvedValue({ ok: false, error: { code: 'internal' } })
    await result.changeConsent(true)
    expect(result.state).toEqual(before)
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'error' }))
  })

  it('keeps the profile and warns when the birthday is locked', async () => {
    const { result } = await mountComposable(useProfileScreen)
    const before = result.state.status === 'success' ? result.state.value.birthday : undefined
    vi.spyOn(services().profile, 'updateProfile').mockResolvedValue({ ok: false, error: { code: 'birthdayLocked', changeableAt: '2027-01-01T00:00:00Z' } })
    await result.birthday.save({ day: 5, month: 3 } as never, 'save')
    await vi.waitFor(() => expect(result.state.status).toBe('success'))
    expect(result.state.status === 'success' && result.state.value.birthday).toEqual(before)
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'error' }))
    expect(result.birthday.pending).toBeNull()
  })

  it('has no lock date for a free birthday', async () => {
    const { result } = await mountComposable(useProfileScreen)
    expect(result.birthday.lockedUntil).toBeNull()
    expect(result.birthday.labels.locked).toBeNull()
  })

  it('signs out after the account is erased, but not when erasing fails', async () => {
    const { result } = await mountComposable(useProfileScreen)
    vi.spyOn(services().account, 'eraseAccount').mockResolvedValueOnce({ ok: false, error: { code: 'internal' } })
    await result.eraseAccount()
    expect(signOutMock).not.toHaveBeenCalled()
    vi.spyOn(services().account, 'eraseAccount').mockResolvedValueOnce({ ok: true, value: undefined } as never)
    await result.eraseAccount()
    expect(signOutMock).toHaveBeenCalledTimes(1)
    expect(result.erasing).toBe(false)
  })

  it('signs out without a toast when the data download is unauthorized', async () => {
    vi.spyOn(services().dataExport, 'exportMyData').mockResolvedValue({ ok: false, error: { code: 'unauthorized' } })
    const { result } = await mountComposable(useProfileScreen)
    await result.downloadData()
    expect(signOutMock).toHaveBeenCalledTimes(1)
    expect(toastAdd).not.toHaveBeenCalled()
  })
})

describe('useBirthdayEditing', () => {
  it('asks for a fresh profile when the server says the birthday is locked', async () => {
    const reload = vi.fn().mockResolvedValue(undefined)
    const { result: screen } = await mountComposable(useProfileScreen)
    const { result } = await mountComposable(() =>
      useBirthdayEditing({ state: computed(() => screen.state), set: vi.fn(), reload }),
    )
    vi.spyOn(services().profile, 'updateProfile').mockResolvedValue({ ok: false, error: { code: 'birthdayLocked', changeableAt: '2027-01-01T00:00:00Z' } })
    await result.save({ day: 5, month: 3 } as never, 'save')
    expect(reload).toHaveBeenCalledTimes(1)
  })
})
