import type { PiiService } from '../../common/pii.service'
import {
  type CustomerCounts,
  type CustomerPageQuery,
  CustomersRepository,
  type CustomerScope,
  type RawCustomerCardRow,
} from './customers.repository'

/** Devolve as linhas que o teste montou (até o `limit` pedido) e guarda o que o service perguntou. */
export class FakeCustomersRepository extends CustomersRepository {
  rows: RawCustomerCardRow[] = []
  counts: CustomerCounts = { total: 0, acceptingNotifications: 0 }
  pageQueries: CustomerPageQuery[] = []
  countScopes: CustomerScope[] = []

  async listShopCustomers(query: CustomerPageQuery): Promise<RawCustomerCardRow[]> {
    this.pageQueries.push(query)
    return this.rows.slice(0, query.limit)
  }

  async countShopCustomers(scope: CustomerScope): Promise<CustomerCounts> {
    this.countScopes.push(scope)
    return this.counts
  }
}

/** Cliente com celular `679999900NN` cifrado e id terminado em NN. */
export function rawCustomer(pii: PiiService, index: number, overrides: Partial<RawCustomerCardRow> = {}): RawCustomerCardRow {
  const suffix = String(index).padStart(2, '0')
  return {
    customerId: `018f98a2-7b2a-7182-9f33-6d004bbbb0${suffix}`,
    phoneEncrypted: pii.encrypt(`679999900${suffix}`),
    firstName: `Cliente ${suffix}`,
    unit: 'stamp',
    balance: 2,
    target: 10,
    visitsCount: 1,
    lastVisitAt: new Date('2026-10-06T10:00:00Z'),
    acceptsNotifications: false,
    ...overrides,
  }
}
