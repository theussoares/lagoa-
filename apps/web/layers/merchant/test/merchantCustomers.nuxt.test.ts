import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { CustomerFilter, MerchantCustomerPage, MerchantCustomerRow } from '#shared/schemas/customer'
import { CustomerIdSchema, type CustomerId } from '#shared/schemas/ids'
import { MaskedPhoneSchema } from '#shared/schemas/phone'
import type { TransportError } from '#shared/types/errors'
import type { Result } from '#shared/types/result'
import { mountComposable } from '#layers/core/test/composableHarness.nuxt'
import { useMerchantCustomers } from '../app/composables/useMerchantCustomers'

type ListCustomers = (filter: CustomerFilter, cursor?: CustomerId | null) => Promise<Result<MerchantCustomerPage, TransportError>>

const { listCustomersMock } = vi.hoisted(() => ({ listCustomersMock: vi.fn<ListCustomers>() }))
mockNuxtImport('useMerchantServices', () => () => ({ customers: { listCustomers: listCustomersMock } }))

const row = (index: number): MerchantCustomerRow => ({
  customerId: CustomerIdSchema.parse(`018f98a2-7b2a-7182-9f33-6d004bbbb0${String(index).padStart(2, '0')}`),
  maskedPhone: MaskedPhoneSchema.parse('(67) 9••••-0001'),
  firstName: null,
  unit: 'stamp',
  balance: 1,
  target: 10,
  visitsCount: 1,
  lastVisitAt: null,
  isLapsed: false,
  acceptsNotifications: false,
  lastAmountCents: null,
})

const page = (items: MerchantCustomerRow[], nextCursor: CustomerId | null, total = 3): Result<MerchantCustomerPage, TransportError> => ({
  ok: true,
  value: { items, nextCursor, total, acceptingNotifications: 0 },
})

describe('useMerchantCustomers', () => {
  beforeEach(() => listCustomersMock.mockReset())

  it('loads the first page, then appends the next one with the cursor it got', async () => {
    listCustomersMock.mockResolvedValueOnce(page([row(1), row(2)], row(2).customerId)).mockResolvedValueOnce(page([row(3)], null))
    const { result } = await mountComposable(() => useMerchantCustomers('lapsed'))

    await result.loadMore()

    expect(listCustomersMock.mock.calls).toEqual([['lapsed'], ['lapsed', row(2).customerId]])
    expect(result.state.value).toEqual({ status: 'success', value: { items: [row(1), row(2), row(3)], nextCursor: null, total: 3, acceptingNotifications: 0 } })
    await result.loadMore()
    expect(listCustomersMock).toHaveBeenCalledTimes(2)
  })

  it('keeps the loaded rows and shows the error when the next page fails', async () => {
    listCustomersMock.mockResolvedValueOnce(page([row(1)], row(1).customerId)).mockResolvedValueOnce({ ok: false, error: { code: 'network' } })
    const { result } = await mountComposable(() => useMerchantCustomers())

    await result.loadMore()

    expect(result.loadMoreError.value).toEqual({ code: 'network' })
    expect(result.state.value).toMatchObject({ status: 'success', value: { items: [row(1)] } })
    expect(result.loadingMore.value).toBe(false)
  })

  it('drops a next page that arrives after the filter changed', async () => {
    let resolveNext: (value: Result<MerchantCustomerPage, TransportError>) => void = () => undefined
    listCustomersMock
      .mockResolvedValueOnce(page([row(1)], row(1).customerId))
      .mockReturnValueOnce(new Promise((resolve) => (resolveNext = resolve)))
      .mockResolvedValueOnce(page([row(9)], null, 1))
    const { result } = await mountComposable(() => useMerchantCustomers())

    const pending = result.loadMore()
    result.filter.value = 'rewardReady'
    await flushPromises()
    resolveNext(page([row(2)], null))
    await pending

    expect(result.state.value).toMatchObject({ status: 'success', value: { items: [row(9)], total: 1 } })
  })
})
