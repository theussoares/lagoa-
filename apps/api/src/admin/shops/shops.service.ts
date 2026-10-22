import { Injectable } from '@nestjs/common'
import { ADMIN_SHOPS_PAGE_SIZE } from '#shared/constants/domain'
import type { AdminShopAction, AdminShopDetail, AdminShopList, AdminShopListQuery, AdminShopRow } from '#shared/schemas/admin'
import { PhoneNumberSchema } from '#shared/schemas/phone'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import { PiiService } from '../../common/pii.service'
import type { AdminContext } from '../access/admin.context'
import { type AdminShopDetailRecord, type AdminShopRecord, AdminShopsRepository } from './shops.repository'
import { decodeCursor, pageOf, planShopAction } from './shops.rules'

const notFound = (): ErrorOf<'notFound'> => ({ code: 'notFound', entity: 'shop' })

const toRow = (record: AdminShopRecord): AdminShopRow => ({
  id: record.id,
  name: record.name,
  category: record.category,
  neighborhood: record.neighborhood,
  status: record.status,
  plan: record.plan,
  createdAt: record.createdAt.toISOString(),
})

@Injectable()
export class AdminShopsService {
  constructor(
    private readonly shops: AdminShopsRepository,
    private readonly pii: PiiService,
  ) {}

  async list(query: AdminShopListQuery): Promise<AdminShopList> {
    const rows = await this.shops.list({
      status: query.status ?? null,
      name: query.q ?? null,
      after: query.cursor === undefined ? null : decodeCursor(query.cursor),
      limit: ADMIN_SHOPS_PAGE_SIZE + 1,
    })
    const page = pageOf(rows, ADMIN_SHOPS_PAGE_SIZE)
    return { shops: page.items.map(toRow), nextCursor: page.nextCursor }
  }

  async detail(shopId: string): Promise<Result<AdminShopDetail, ErrorOf<'notFound'>>> {
    const record = await this.shops.findDetail(shopId)
    return record === null ? err(notFound()) : ok(this.toDetail(record))
  }

  /** `nothingToChange` (trocar para o plano que já tem) e ação que não parte da situação atual são ambos `invalidTransition`. */
  async act(admin: AdminContext, shopId: string, action: AdminShopAction): Promise<Result<AdminShopDetail, ErrorOf<'notFound' | 'invalidTransition'>>> {
    const changed = await this.shops.applyAction(shopId, admin.adminId, planShopAction(action))
    if (!changed.ok) {
      if (changed.reason === 'shopNotFound') return err(notFound())
      if (changed.reason === 'invalidActor') throw new Error('admin actor cannot be invalid')
      return err({ code: 'invalidTransition' })
    }
    return this.detail(shopId)
  }

  /** O celular e o e-mail do dono saem decifrados só aqui, e nunca vão para log. */
  private toDetail(record: AdminShopDetailRecord): AdminShopDetail {
    return {
      ...toRow(record),
      addressLine: record.addressLine,
      program: record.program,
      owner:
        record.owner === null
          ? null
          : {
              phone: PhoneNumberSchema.parse(this.pii.decrypt(record.owner.phoneEncrypted)),
              email: record.owner.emailEncrypted === null ? null : this.pii.decrypt(record.owner.emailEncrypted),
            },
      stats: { customers: record.customers, visitsLast30Days: record.visitsLast30Days },
      history: record.history.map((event) => ({ ...event, createdAt: event.createdAt.toISOString() })),
    }
  }
}
