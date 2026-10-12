import type { CustomerFilter } from '#shared/schemas/customer'
import type { ProgramUnit } from '#shared/schemas/program'

export interface RawCustomerCardRow {
  readonly customerId: string
  readonly phoneEncrypted: Buffer
  readonly firstName: string | null
  readonly unit: ProgramUnit
  readonly balance: number
  readonly target: number
  readonly visitsCount: number
  readonly lastVisitAt: Date | null
  readonly acceptsNotifications: boolean
}

/** Quem entra na lista: a loja do dono e o filtro da aba, já resolvido em instante (`lapsedCutoff`). */
export interface CustomerScope {
  readonly shopId: string
  readonly filter: CustomerFilter
  readonly lapsedCutoff: Date
}

export interface CustomerPageQuery extends CustomerScope {
  /** Último cliente da página anterior; `null` na primeira. */
  readonly after: string | null
  readonly limit: number
}

export interface CustomerCounts {
  readonly total: number
  readonly acceptingNotifications: number
}

export abstract class CustomersRepository {
  /** Mais recentes primeiro (`lastVisitAt desc nulls last`, desempate pelo cartão), no máximo `limit` linhas. */
  abstract listShopCustomers(query: CustomerPageQuery): Promise<RawCustomerCardRow[]>
  abstract countShopCustomers(scope: CustomerScope): Promise<CustomerCounts>
}
