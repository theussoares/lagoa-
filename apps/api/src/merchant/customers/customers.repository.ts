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

export abstract class CustomersRepository {
  abstract listShopCustomers(shopId: string): Promise<RawCustomerCardRow[]>
}
