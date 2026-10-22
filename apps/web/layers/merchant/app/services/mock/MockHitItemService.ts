import { HIT_ITEMS_MAX_FOUNDER } from '#shared/constants/domain'
import type { HitItemDraft, MerchantHitItem, MerchantHitItemList } from '#shared/schemas/hitItem'
import type { ShopPhotoUpload } from '#shared/schemas/shop'
import { toIso } from '#shared/utils/time'
import { err, ok } from '#shared/types/result'
import type { Result } from '#shared/types/result'
import type { HitItemError, HitItemService } from '../HitItemService'

interface MockHitItemOptions {
  readonly cap?: number
  readonly seed?: readonly MerchantHitItem[]
}

/** Mesmo contrato do http (regras da API: edição volta para a análise, arquivado só desarquiva); fica na memória da aba. */
export class MockHitItemService implements HitItemService {
  private items: MerchantHitItem[]
  private readonly cap: number

  constructor(options: MockHitItemOptions = {}) {
    this.items = [...(options.seed ?? [])]
    this.cap = options.cap ?? HIT_ITEMS_MAX_FOUNDER
  }

  list(): Promise<Result<MerchantHitItemList, HitItemError>> {
    return Promise.resolve(ok({ items: [...this.items], cap: this.cap }))
  }

  create(draft: HitItemDraft): Promise<Result<MerchantHitItem, HitItemError>> {
    if (this.activeCount() >= this.cap) return Promise.resolve(err({ code: 'limitReached' }))
    const now = this.now()
    const item: MerchantHitItem = {
      ...draft,
      id: crypto.randomUUID(),
      status: 'pending',
      rejectionReason: null,
      photoUrl: null,
      createdAt: now,
      updatedAt: now,
    }
    this.items = [item, ...this.items]
    return Promise.resolve(ok(item))
  }

  update(id: string, draft: HitItemDraft): Promise<Result<MerchantHitItem, HitItemError>> {
    return this.change(id, (item) => (item.status === 'archived' ? err({ code: 'invalidTransition' }) : ok(this.backToReview(item, draft))))
  }

  uploadPhoto(id: string, upload: ShopPhotoUpload): Promise<Result<MerchantHitItem, HitItemError>> {
    const photoUrl = `data:${upload.contentType};base64,${upload.dataBase64}`
    return this.change(id, (item) => (item.status === 'archived' ? err({ code: 'invalidTransition' }) : ok(this.backToReview({ ...item, photoUrl }, item))))
  }

  archive(id: string): Promise<Result<MerchantHitItem, HitItemError>> {
    return this.change(id, (item) => ok(item.status === 'archived' ? item : { ...item, status: 'archived', updatedAt: this.now() }))
  }

  unarchive(id: string): Promise<Result<MerchantHitItem, HitItemError>> {
    return this.change(id, (item) => {
      if (item.status !== 'archived') return err({ code: 'invalidTransition' })
      if (this.activeCount() >= this.cap) return err({ code: 'limitReached' })
      return ok(this.backToReview(item, item))
    })
  }

  private activeCount(): number {
    return this.items.filter((item) => item.status !== 'archived').length
  }

  private now(): string {
    return toIso(new Date())
  }

  private backToReview(item: MerchantHitItem, fields: HitItemDraft): MerchantHitItem {
    const { title, description, priceCents, contact, endsAt } = fields
    return { ...item, title, description, priceCents, contact, endsAt, status: 'pending', rejectionReason: null, updatedAt: this.now() }
  }

  private change(id: string, edit: (item: MerchantHitItem) => Result<MerchantHitItem, HitItemError>): Promise<Result<MerchantHitItem, HitItemError>> {
    const current = this.items.find((item) => item.id === id)
    if (current === undefined) return Promise.resolve(err({ code: 'notFound', entity: 'hitItem' }))
    const result = edit(current)
    if (result.ok) this.items = this.items.map((item) => (item.id === id ? result.value : item))
    return Promise.resolve(result)
  }
}
