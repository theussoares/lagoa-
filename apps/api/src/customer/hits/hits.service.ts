import { Inject, Injectable, Logger, Optional } from '@nestjs/common'
import { HITS_BANNERS_MAX, HITS_PAGE_SIZE } from '#shared/constants/domain'
import { categoriesOf } from '#shared/domain/shopGroup'
import { showcaseEarning } from '#shared/domain/showcaseEarning'
import { type HitsBanner, type HitsQuery, type PublicHitItem, PublicHitItemSchema, type PublicHitItemPage } from '#shared/schemas/showcase'
import { Clock } from '../../common/clock'
import { ENV } from '../../config/config.module'
import type { Env } from '../../config/env'
import { contactFromColumns } from '../../shops/shop-contact-columns'
import { shopAssetUrl } from '../../storage/shop-assets'
import { CustomerHitsRepository, type PublicHitRecord } from './hits.repository'

/** Tamanho da página; opcional, o padrão é `HITS_PAGE_SIZE` (testes passam um menor para forçar a fronteira). */
export const CUSTOMER_HITS_PAGE_SIZE = Symbol('CUSTOMER_HITS_PAGE_SIZE')

@Injectable()
export class CustomerHitsService {
  private readonly logger = new Logger(CustomerHitsService.name)

  constructor(
    private readonly repository: CustomerHitsRepository,
    @Inject(ENV) private readonly env: Pick<Env, 'SUPABASE_URL'>,
    private readonly clock: Clock,
    @Optional() @Inject(CUSTOMER_HITS_PAGE_SIZE) private readonly pageSize: number = HITS_PAGE_SIZE,
  ) {}

  async list(query: HitsQuery): Promise<PublicHitItemPage> {
    const now = this.clock.now()
    const rows = await this.repository.listFeed({
      categories: query.group === undefined ? null : categoriesOf(query.group),
      after: query.cursor ?? null,
      limit: this.pageSize + 1,
      now,
    })
    const page = rows.slice(0, this.pageSize)
    const last = page[page.length - 1]
    return { items: page.flatMap((row) => this.toItem(row, now)), nextCursor: rows.length > this.pageSize && last ? last.id : null }
  }

  /** Pagos primeiro (mais antigo primeiro), depois o produto mais novo de cada loja Pro que ainda não apareceu. */
  async banners(): Promise<HitsBanner[]> {
    const now = this.clock.now()
    const paid = await this.repository.listPaidBannerItems(now, HITS_BANNERS_MAX)
    const banners = this.distinctShops(paid, [], now, true)
    if (banners.length >= HITS_BANNERS_MAX) return banners.slice(0, HITS_BANNERS_MAX)
    const shown = banners.map((banner) => banner.item.shop.id)
    const pro = await this.repository.listProBannerItems(now, shown, HITS_BANNERS_MAX - banners.length)
    return [...banners, ...this.distinctShops(pro, shown, now, false)].slice(0, HITS_BANNERS_MAX)
  }

  /** Um banner por loja: a mesma loja não ocupa duas vagas do topo. */
  private distinctShops(rows: readonly PublicHitRecord[], alreadyShown: readonly string[], now: Date, sponsored: boolean): HitsBanner[] {
    const seen = new Set(alreadyShown)
    return rows.flatMap((row) => {
      const [item] = this.toItem(row, now)
      if (!item || seen.has(item.shop.id)) return []
      seen.add(item.shop.id)
      return [{ item, sponsored }]
    })
  }

  /** Produto com clube quebrado ou fora do contrato fica de fora, em vez de derrubar a vitrine. */
  private toItem(row: PublicHitRecord, now: Date): PublicHitItem[] {
    if (row.shop === null) return []
    const { shop } = row
    const candidate = {
      id: row.id,
      title: row.title,
      description: row.description,
      priceCents: row.priceCents,
      photoUrl: shopAssetUrl(this.env.SUPABASE_URL, row.photoPath),
      earning: showcaseEarning({ rules: shop.program.rules, bonusRules: shop.program.bonusRules, priceCents: row.priceCents, now }),
      contact: contactFromColumns(row.itemContact) ?? shop.contact,
      shop: { id: shop.id, name: shop.name, category: shop.category, neighborhood: shop.neighborhood },
    }
    const parsed = PublicHitItemSchema.safeParse(candidate)
    if (parsed.success) return [parsed.data]
    this.logger.warn(`Hit item ${row.id} skipped: breaks the contract`)
    return []
  }
}
