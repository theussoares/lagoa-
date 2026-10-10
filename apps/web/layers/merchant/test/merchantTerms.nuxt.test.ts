import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent } from 'vue'
import { MERCHANT_TERMS_VERSION } from '#shared/constants/domain'
import { err, ok } from '#shared/types/result'
import type { MerchantTerms } from '../app/types/terms'
import { useMerchantTerms } from '../app/composables/useMerchantTerms'
import { useMerchantSessionStore } from '../app/stores/merchantSession'
import { cafeSession } from '#layers/core/test/fixtures'

const { acceptMock, expireMock } = vi.hoisted(() => ({ acceptMock: vi.fn(), expireMock: vi.fn() }))
mockNuxtImport('useMerchantServices', () => () => ({ terms: { accept: acceptMock } }))
mockNuxtImport('useMerchantSession', () => () => ({ expire: expireMock }))

async function mountTerms(onAccepted = vi.fn(async () => {})): Promise<MerchantTerms> {
  let terms: MerchantTerms | undefined
  await mountSuspended(
    defineComponent({
      setup() {
        terms = useMerchantTerms(onAccepted)
        return () => null
      },
    }),
  )
  if (terms === undefined) throw new Error('composable did not run')
  return terms
}

describe('useMerchantTerms', () => {
  beforeEach(() => {
    acceptMock.mockReset()
    expireMock.mockReset()
    useMerchantSessionStore().startMerchant({ ...cafeSession, termsAccepted: false })
  })

  it('accepts the current version, unlocks the session and reloads the screen', async () => {
    acceptMock.mockResolvedValue(ok(undefined))
    const onAccepted = vi.fn(async () => {})
    const terms = await mountTerms(onAccepted)
    expect(terms.needed.value).toBe(true)
    await terms.accept()
    expect(acceptMock).toHaveBeenCalledWith(MERCHANT_TERMS_VERSION)
    expect(terms.needed.value).toBe(false)
    expect(useMerchantSessionStore().merchant?.termsAccepted).toBe(true)
    expect(onAccepted).toHaveBeenCalledTimes(1)
  })

  it('keeps the error code and the lock when the server refuses', async () => {
    acceptMock.mockResolvedValue(err({ code: 'merchantTermsNotAccepted' }))
    const terms = await mountTerms()
    await terms.accept()
    expect(terms.state.value).toEqual({ status: 'error', code: 'merchantTermsNotAccepted' })
    expect(terms.needed.value).toBe(true)
  })

  it('expires the session on unauthorized', async () => {
    acceptMock.mockResolvedValue(err({ code: 'unauthorized' }))
    const terms = await mountTerms()
    await terms.accept()
    expect(expireMock).toHaveBeenCalledTimes(1)
  })

  it('ignores a second click while accepting', async () => {
    let resolve: (value: unknown) => void = () => {}
    acceptMock.mockReturnValue(new Promise((r) => (resolve = r)))
    const terms = await mountTerms()
    const first = terms.accept()
    await terms.accept()
    resolve(ok(undefined))
    await first
    expect(acceptMock).toHaveBeenCalledTimes(1)
  })
})
