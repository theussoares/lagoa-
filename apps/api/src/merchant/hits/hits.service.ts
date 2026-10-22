import { Inject, Injectable } from '@nestjs/common'
import { uuidv7 } from 'uuidv7'
import type { HitItemDraft, MerchantHitItem, MerchantHitItemList } from '#shared/schemas/hitItem'
import type { ShopPhotoUpload } from '#shared/schemas/shop'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import { ENV } from '../../config/config.module'
import type { Env } from '../../config/env'
import { canCreateOrUnarchive, hitItemCap, planMerchantEdit } from '../../hits/hit-item.rules'
import { shopAssetUrl } from '../../storage/shop-assets'
import { columnsFromContact, contactFromColumns } from '../../shops/shop-contact-columns'
import type { MerchantShopContext } from '../access/merchant-shop.context'
import { checkShopPhoto } from '../shop-photo/shop-photo.rules'
import { ShopPhotoStorage } from '../shop-photo/shop-photo.storage'
import { type HitItemDraftValues, type HitItemPatch, type HitItemRow, HitsRepository } from './hits.repository'

/** Arquivados que a lista ainda mostra (os ativos aparecem todos). */
const ARCHIVED_RECENT_LIMIT = 50

const notFound = (): ErrorOf<'notFound'> => ({ code: 'notFound', entity: 'hitItem' })

function draftValues(draft: HitItemDraft): HitItemDraftValues {
  return {
    title: draft.title,
    description: draft.description,
    priceCents: draft.priceCents,
    endsAt: draft.endsAt === null ? null : new Date(draft.endsAt),
    ...columnsFromContact(draft.contact),
  }
}

/** Produtos do Hits da loja. Toda edição volta o item para a fila do admin; arquivado só sai de lá desarquivando. */
@Injectable()
export class HitsService {
  constructor(
    private readonly items: HitsRepository,
    private readonly storage: ShopPhotoStorage,
    @Inject(ENV) private readonly env: Pick<Env, 'SUPABASE_URL'>,
  ) {}

  private toItem(row: HitItemRow): MerchantHitItem {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      priceCents: row.priceCents,
      contact: contactFromColumns(row),
      endsAt: row.endsAt === null ? null : row.endsAt.toISOString(),
      status: row.status,
      rejectionReason: row.rejectionReason,
      photoUrl: row.photoPath === null ? null : shopAssetUrl(this.env.SUPABASE_URL, row.photoPath),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }
  }

  async list(shop: MerchantShopContext): Promise<MerchantHitItemList> {
    const rows = await this.items.listForShop(shop.shopId, ARCHIVED_RECENT_LIMIT)
    return { items: rows.map((row) => this.toItem(row)), cap: hitItemCap(shop.plan) }
  }

  async create(shop: MerchantShopContext, draft: HitItemDraft): Promise<Result<MerchantHitItem, ErrorOf<'limitReached'>>> {
    const created = await this.items.insert(shop.shopId, draftValues(draft), (activeCount) =>
      canCreateOrUnarchive({ plan: shop.plan, activeCount }),
    )
    return created.ok ? ok(this.toItem(created.value)) : created
  }

  async update(shop: MerchantShopContext, id: string, draft: HitItemDraft): Promise<Result<MerchantHitItem, ErrorOf<'notFound' | 'invalidTransition'>>> {
    const saved = await this.items.updateLocked(shop.shopId, id, (row) => {
      if (row.status === 'archived') return err({ code: 'invalidTransition' })
      return ok({ ...draftValues(draft), ...planMerchantEdit(row), rejectionReason: null })
    })
    return saved.ok ? ok(this.toItem(saved.value)) : narrowEdit(saved)
  }

  async replacePhoto(
    shop: MerchantShopContext,
    id: string,
    upload: ShopPhotoUpload,
  ): Promise<Result<MerchantHitItem, ErrorOf<'notFound' | 'invalidTransition' | 'invalidShopPhoto' | 'internal'>>> {
    const photo = checkShopPhoto(upload)
    if (!photo.ok) return photo
    // Dono e situação conferidos antes de gravar no bucket: item alheio ou arquivado não deixa arquivo órfão.
    const current = await this.items.findForShop(shop.shopId, id)
    if (current === null) return err(notFound())
    if (current.status === 'archived') return err({ code: 'invalidTransition' })
    const path = `hits/${shop.shopId}/${id}-${uuidv7()}.${photo.value.extension}`
    if (!(await this.storage.upload(path, photo.value.bytes, photo.value.contentType))) return err({ code: 'internal' })
    let previous: string | null = null
    const saved = await this.items.updateLocked(shop.shopId, id, (row) => {
      if (row.status === 'archived') return err({ code: 'invalidTransition' })
      previous = row.photoPath
      return ok({ photoPath: path, ...planMerchantEdit(row), rejectionReason: null })
    })
    if (!saved.ok) {
      await this.storage.remove(path)
      return narrowEdit(saved)
    }
    if (previous !== null && previous !== path) await this.storage.remove(previous)
    return ok(this.toItem(saved.value))
  }

  async archive(shop: MerchantShopContext, id: string): Promise<Result<MerchantHitItem, ErrorOf<'notFound'>>> {
    const saved = await this.items.updateLocked(shop.shopId, id, (row): Result<HitItemPatch, never> => {
      if (row.status === 'archived') return ok({})
      return ok({ status: 'archived' })
    })
    if (!saved.ok) return err(notFound())
    return ok(this.toItem(saved.value))
  }

  async unarchive(shop: MerchantShopContext, id: string): Promise<Result<MerchantHitItem, ErrorOf<'notFound' | 'limitReached' | 'invalidTransition'>>> {
    const saved = await this.items.updateLocked(shop.shopId, id, (row, activeCount) => {
      if (row.status !== 'archived') return err({ code: 'invalidTransition' })
      const allowed = canCreateOrUnarchive({ plan: shop.plan, activeCount })
      if (!allowed.ok) return allowed
      return ok({ ...planMerchantEdit(row), rejectionReason: null })
    })
    return saved.ok ? ok(this.toItem(saved.value)) : saved
  }
}

function narrowEdit(failure: { ok: false; error: ErrorOf<'notFound' | 'limitReached' | 'invalidTransition'> }): Result<never, ErrorOf<'notFound' | 'invalidTransition'>> {
  // Editar não conta contra o teto: `limitReached` só sai do desarquivar.
  return failure.error.code === 'limitReached' ? err({ code: 'invalidTransition' }) : err(failure.error)
}
