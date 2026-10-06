import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useNuxtApp } from '#imports'
import { PhoneNumberSchema } from '#shared/schemas/phone'
import type { CustomerSession } from '#shared/schemas/session'
import { mountComposable } from '#layers/core/test/composableHarness.nuxt'
import { useSessionStore } from '#layers/core/app/stores/session'
import { useCustomerSignIn } from '../app/composables/useCustomerSignIn'

const PHONE = PhoneNumberSchema.parse('67991230374')
const returning: CustomerSession = { role: 'customer', customerId: '0190a000-0000-7000-8000-000000000001' as CustomerSession['customerId'], isNewCustomer: false }
const created: CustomerSession = { ...returning, isNewCustomer: true }

const profileOf = (firstName: string | null) => ({ ok: true as const, value: { firstName } as never })

async function atCodeStep() {
  const mounted = await mountComposable(() => useCustomerSignIn())
  await mounted.result.requestCode('(67) 99123-0374')
  return mounted.result
}

describe('useCustomerSignIn', () => {
  let accept: ReturnType<typeof vi.spyOn>
  let consent: ReturnType<typeof vi.spyOn>
  let getProfile: ReturnType<typeof vi.spyOn>
  let signIn: ReturnType<typeof vi.spyOn>
  let register: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    const { $auth, $customerServices } = useNuxtApp()
    vi.restoreAllMocks()
    vi.spyOn($auth, 'requestLoginCode').mockResolvedValue({ ok: true, value: { expiresAt: '2026-10-01T16:05:00.000Z' } as never })
    accept = vi.spyOn($customerServices.profile, 'acceptTerms').mockResolvedValue({ ok: true, value: {} as never })
    consent = vi.spyOn($customerServices.profile, 'setNotificationConsent').mockResolvedValue({ ok: true, value: {} as never })
    getProfile = vi.spyOn($customerServices.profile, 'getProfile').mockResolvedValue(profileOf('Ana'))
    signIn = vi.spyOn($auth, 'signInCustomer')
    register = vi.spyOn($auth, 'registerCustomer')
    useSessionStore().endCustomer()
  })

  it('welcomes a returning customer by name and never asks about notices again', async () => {
    signIn.mockResolvedValue({ ok: true, value: { kind: 'signedIn', session: returning } })
    const signInFlow = await atCodeStep()
    expect(await signInFlow.verify('123456')).toBe('signedIn')
    expect(signInFlow.greeting.value).toEqual({ kind: 'back', name: 'Ana' })
    expect(useSessionStore().customer).toEqual(returning)
    expect(consent).not.toHaveBeenCalled()
    expect(accept).not.toHaveBeenCalled()
  })

  it('welcomes a returning customer without a name with the plain greeting', async () => {
    getProfile.mockResolvedValue(profileOf(null))
    signIn.mockResolvedValue({ ok: true, value: { kind: 'signedIn', session: returning } })
    const signInFlow = await atCodeStep()
    await signInFlow.verify('123456')
    expect(signInFlow.greeting.value).toEqual({ kind: 'back', name: null })
  })

  it('sends a new number to the sign-up step without creating the account', async () => {
    signIn.mockResolvedValue({ ok: true, value: { kind: 'signUp' } })
    const signInFlow = await atCodeStep()
    expect(await signInFlow.verify('123456')).toBe('signUp')
    expect(signInFlow.step.value).toEqual({ name: 'profile' })
    expect(register).not.toHaveBeenCalled()
    expect(useSessionStore().customer).toBeNull()
  })

  it('requires the name and checks the optional e-mail before calling the API', async () => {
    signIn.mockResolvedValue({ ok: true, value: { kind: 'signUp' } })
    const signInFlow = await atCodeStep()
    await signInFlow.verify('123456')
    expect(await signInFlow.signUp({ firstName: '   ', email: '', notificationConsent: false })).toBe(false)
    expect(signInFlow.fieldError.value).toBe('firstNameRequired')
    expect(await signInFlow.signUp({ firstName: 'Ana', email: 'nope', notificationConsent: false })).toBe(false)
    expect(signInFlow.fieldError.value).toBe('invalidEmail')
    expect(register).not.toHaveBeenCalled()
  })

  it('creates the account with the trimmed name, no e-mail when blank, and accepts the terms', async () => {
    signIn.mockResolvedValue({ ok: true, value: { kind: 'signUp' } })
    register.mockResolvedValue({ ok: true, value: created })
    const signInFlow = await atCodeStep()
    await signInFlow.verify('123456')
    expect(await signInFlow.signUp({ firstName: ' Ana ', email: '  ', notificationConsent: false })).toBe(true)
    expect(register).toHaveBeenCalledWith({ firstName: 'Ana' })
    expect(accept).toHaveBeenCalledOnce()
    expect(consent).not.toHaveBeenCalled()
    expect(signInFlow.greeting.value).toEqual({ kind: 'new', name: 'Ana' })
    expect(useSessionStore().customer).toEqual(created)
  })

  it('sends the e-mail and turns notices on only when the person chose to', async () => {
    signIn.mockResolvedValue({ ok: true, value: { kind: 'signUp' } })
    register.mockResolvedValue({ ok: true, value: created })
    const signInFlow = await atCodeStep()
    await signInFlow.verify('123456')
    await signInFlow.signUp({ firstName: 'Ana', email: 'ana@example.com', notificationConsent: true })
    expect(register).toHaveBeenCalledWith({ firstName: 'Ana', email: 'ana@example.com' })
    expect(consent).toHaveBeenCalledWith(true)
  })

  it('keeps the person on the sign-up step when the e-mail belongs to another account', async () => {
    signIn.mockResolvedValue({ ok: true, value: { kind: 'signUp' } })
    register.mockResolvedValue({ ok: false, error: { code: 'emailAlreadyUsed' } })
    const signInFlow = await atCodeStep()
    await signInFlow.verify('123456')
    expect(await signInFlow.signUp({ firstName: 'Ana', email: 'ana@example.com', notificationConsent: false })).toBe(false)
    expect(signInFlow.error.value).toBe('emailAlreadyUsed')
    expect(signInFlow.step.value).toEqual({ name: 'profile' })
    expect(useSessionStore().customer).toBeNull()
  })
})
