import { Inject, Injectable } from '@nestjs/common'
import { ADMIN_HIT_ITEMS_PAGE_SIZE } from '#shared/constants/domain'
import type { AdminHitItem, AdminHitItemList, AdminHitItemListQuery, HitItemReview } from '#shared/schemas/admin'
import { err, ok, type Result } from '#shared/types/result'
import { ENV } from '../../config/config.module'
import type { Env } from '../../config/env'
import { planReview } from '../../hits/hit-item.rules'
import { contactFromColumns } from '../../shops/shop-contact-columns'
import { shopAssetUrl } from '../../storage/shop-assets'
import type { AdminContext } from '../access/admin.context'
import { type AdminHitItemRecord, AdminHitsRepository, type ReviewError } from './hits.repository'


/** Fila de moderação do Hits. O botão mostrado é o que o cliente veria: o do produto ou, sem ele, o da loja. */
@Injectable()
export class AdminHitsService {
  constructor(
    private readonly items: AdminHitsRepository,
    @Inject(ENV) private readonly env: Pick<Env, 'SUPABASE_URL'>,
  ) {}

  async list(query: AdminHitItemListQuery): Promise<AdminHitItemList> {
    const rows = await this.items.list({ tab: query.status, after: query.cursor ?? null, limit: ADMIN_HIT_ITEMS_PAGE_SIZE + 1 })
    const page = rows.slice(0, ADMIN_HIT_ITEMS_PAGE_SIZE)
    const last = page[page.length - 1]
    return { items: page.map((row) => this.toItem(row)), nextCursor: rows.length > ADMIN_HIT_ITEMS_PAGE_SIZE && last ? last.id : null }
  }

  /** Aprovar exige foto: a fila já esconde item sem ela, e o id direto não pode furar isso. */
  async review(admin: AdminContext, id: string, review: HitItemReview): Promise<Result<AdminHitItem, ReviewError>> {
    const saved = await this.items.review(id, admin.adminId, (current) => {
      if (review.action === 'approve' && current.photoPath === null) return err({ code: 'invalidTransition' })
      return planReview(current, review)
    })
    return saved.ok ? ok(this.toItem(saved.value)) : saved
  }

  private toItem(row: AdminHitItemRecord): AdminHitItem {
    const own = contactFromColumns(row.itemContact)
    const contact = own ?? contactFromColumns(row.shop.contact)
    return {
      id: row.id,
      version: row.version,
      title: row.title,
      description: row.description,
      priceCents: row.priceCents,
      endsAt: row.endsAt === null ? null : row.endsAt.toISOString(),
      status: row.status,
      rejectionReason: row.rejectionReason,
      photoUrl: row.photoPath === null ? null : shopAssetUrl(this.env.SUPABASE_URL, row.photoPath),
      contact,
      contactSource: own === null ? 'shop' : 'item',
      shop: { id: row.shop.id, name: row.shop.name, status: row.shop.status },
      createdAt: row.createdAt.toISOString(),
      approvedAt: row.approvedAt === null ? null : row.approvedAt.toISOString(),
    }
  }
}
