import { Injectable } from '@nestjs/common'
import { MERCHANT_CUSTOMERS_PAGE_SIZE } from '#shared/constants/domain'
import { isLapsedSince, lapsedCutoff } from '#shared/domain/customer'
import type { CustomerFilter, MerchantCustomerPage, MerchantCustomerRow } from '#shared/schemas/customer'
import { CustomerIdSchema } from '#shared/schemas/ids'
import type { PhoneNumber } from '#shared/schemas/phone'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import { maskPhone } from '#shared/utils/phone'
import { toIso } from '#shared/utils/time'
import { Clock } from '../../common/clock'
import { PiiService } from '../../common/pii.service'
import { SessionRepository } from '../session/session.repository'
import { CustomersRepository, type RawCustomerCardRow } from './customers.repository'
import { pageOf } from './customers.rules'

@Injectable()
export class CustomersService {
  constructor(
    private readonly sessionRepo: SessionRepository,
    private readonly customersRepo: CustomersRepository,
    private readonly pii: PiiService,
    private readonly clock: Clock,
  ) {}

  /** Uma página da loja do dono; filtro e contagem no banco, e só os celulares da página são decifrados. */
  async listCustomers(
    ownerUserId: string,
    filter: CustomerFilter = 'all',
    after: string | null = null,
  ): Promise<Result<MerchantCustomerPage, ErrorOf<'notFound'>>> {
    const shop = await this.sessionRepo.findByOwnerUserId(ownerUserId)
    if (!shop) return err({ code: 'notFound', entity: 'merchant' })

    const now = this.clock.now()
    const scope = { shopId: shop.id, filter, lapsedCutoff: lapsedCutoff(now) }
    const [rawRows, counts] = await Promise.all([
      this.customersRepo.listShopCustomers({ ...scope, after, limit: MERCHANT_CUSTOMERS_PAGE_SIZE + 1 }),
      this.customersRepo.countShopCustomers(scope),
    ])
    const page = pageOf(rawRows, MERCHANT_CUSTOMERS_PAGE_SIZE)

    return ok({
      items: page.items.map((raw) => this.toRow(raw, now)),
      nextCursor: page.nextCursor === null ? null : CustomerIdSchema.parse(page.nextCursor),
      total: counts.total,
      acceptingNotifications: counts.acceptingNotifications,
    })
  }

  private toRow(raw: RawCustomerCardRow, now: Date): MerchantCustomerRow {
    const lastVisitAt = raw.lastVisitAt ? toIso(raw.lastVisitAt) : null
    return {
      customerId: CustomerIdSchema.parse(raw.customerId),
      maskedPhone: maskPhone(this.pii.decrypt(raw.phoneEncrypted) as PhoneNumber),
      firstName: raw.firstName,
      unit: raw.unit,
      balance: raw.balance,
      target: raw.target,
      visitsCount: raw.visitsCount,
      lastVisitAt,
      isLapsed: isLapsedSince(lastVisitAt, now),
      acceptsNotifications: raw.acceptsNotifications,
    }
  }
}
