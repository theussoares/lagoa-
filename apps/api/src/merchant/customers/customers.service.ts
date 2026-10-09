import { Injectable } from '@nestjs/common'
import { isLapsedSince } from '#shared/domain/customer'
import { isRewardReady } from '#shared/domain/loyaltyCard'
import type { CustomerFilter, MerchantCustomerRow } from '#shared/schemas/customer'
import { CustomerIdSchema } from '#shared/schemas/ids'
import type { PhoneNumber } from '#shared/schemas/phone'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import { maskPhone } from '#shared/utils/phone'
import { toIso } from '#shared/utils/time'
import { Clock } from '../../common/clock'
import { PiiService } from '../../common/pii.service'
import { SessionRepository } from '../session/session.repository'
import { CustomersRepository } from './customers.repository'

const filters: Readonly<Record<CustomerFilter, (row: MerchantCustomerRow) => boolean>> = {
  all: () => true,
  lapsed: (row) => row.isLapsed,
  rewardReady: (row) => isRewardReady(row),
}

@Injectable()
export class CustomersService {
  constructor(
    private readonly sessionRepo: SessionRepository,
    private readonly customersRepo: CustomersRepository,
    private readonly pii: PiiService,
    private readonly clock: Clock,
  ) {}

  async listCustomers(
    ownerUserId: string,
    filter: CustomerFilter = 'all',
  ): Promise<Result<MerchantCustomerRow[], ErrorOf<'notFound'>>> {
    const shop = await this.sessionRepo.findByOwnerUserId(ownerUserId)
    if (!shop) return err({ code: 'notFound', entity: 'merchant' })

    const rawRows = await this.customersRepo.listShopCustomers(shop.id)
    const now = this.clock.now()

    const rows: MerchantCustomerRow[] = rawRows.map((raw) => {
      const decryptedPhone = this.pii.decrypt(raw.phoneEncrypted)
      const maskedPhone = maskPhone(decryptedPhone as PhoneNumber)
      const lastVisitAt = raw.lastVisitAt ? toIso(raw.lastVisitAt) : null
      const isLapsed = isLapsedSince(lastVisitAt, now)

      return {
        customerId: CustomerIdSchema.parse(raw.customerId),
        maskedPhone,
        firstName: raw.firstName,
        unit: raw.unit,
        balance: raw.balance,
        target: raw.target,
        visitsCount: raw.visitsCount,
        lastVisitAt,
        isLapsed,
        acceptsNotifications: raw.acceptsNotifications,
      }
    })

    return ok(rows.filter(filters[filter]))
  }
}
