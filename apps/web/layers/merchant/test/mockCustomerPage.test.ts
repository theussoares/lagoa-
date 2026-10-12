import { describe, expect, it } from 'vitest'
import { MERCHANT_CUSTOMERS_PAGE_SIZE } from '#shared/constants/domain'
import { CustomerIdSchema } from '#shared/schemas/ids'
import { barbershopSession, makeBackend, staticSession } from '#layers/core/test/fixtures'
import { createMockMerchantServices } from '../app/services/mock/createMockMerchantServices'

/** O mock cumpre o mesmo contrato de página da API (L do SOLID): cursor, contagem e cursor desconhecido. */
describe('mock MerchantCustomersService page', () => {
  const services = () => createMockMerchantServices(makeBackend().backend, staticSession(barbershopSession))

  it('counts the whole filter and who accepts notifications', async () => {
    const result = await services().customers.listCustomers('all')
    if (!result.ok) throw new Error(result.error.code)
    expect(result.value.total).toBe(result.value.items.length)
    expect(result.value.items.length).toBeLessThanOrEqual(MERCHANT_CUSTOMERS_PAGE_SIZE)
    expect(result.value.acceptingNotifications).toBe(result.value.items.filter((row) => row.acceptsNotifications).length)
    expect(result.value.nextCursor).toBeNull()
  })

  it('continues after the cursor and answers an empty page for an unknown one', async () => {
    const merchant = services()
    const first = await merchant.customers.listCustomers('all')
    if (!first.ok) throw new Error(first.error.code)
    const [head, ...rest] = first.value.items
    if (head === undefined) throw new Error('seed customer expected')

    const after = await merchant.customers.listCustomers('all', head.customerId)
    expect(after.ok && after.value.items).toEqual(rest)

    const unknown = await merchant.customers.listCustomers('all', CustomerIdSchema.parse('018f98a2-0000-7000-8000-000000000000'))
    expect(unknown.ok && unknown.value.items).toEqual([])
  })
})
