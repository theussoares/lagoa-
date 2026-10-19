import { expect, it } from 'vitest'
import type { HitItemDraft } from '#shared/schemas/hitItem'
import type { ShopPhotoUpload } from '#shared/schemas/shop'
import type { HitItemService } from '../app/services/HitItemService'

export const draft: HitItemDraft = { title: 'Corte masculino', description: null, priceCents: 4500, contact: null, endsAt: null }
export const upload: ShopPhotoUpload = { contentType: 'image/webp', dataBase64: 'AAAA' }

/** O que todo `HitItemService` (mock ou http) cumpre; só muda quem entrega a implementação. */
export function describeHitItemContract(make: (cap: number) => HitItemService | Promise<HitItemService>): void {
  async function created(service: HitItemService) {
    const result = await service.create(draft)
    if (!result.ok) throw new Error(result.error.code)
    return result.value
  }

  it('creates an item waiting for review, without photo', async () => {
    const item = await created(await make(5))
    expect(item).toMatchObject({ title: 'Corte masculino', status: 'pending', photoUrl: null, rejectionReason: null })
  })

  it('answers limitReached on the item past the cap, and archiving frees the slot', async () => {
    const service = await make(2)
    const first = await created(service)
    await created(service)
    expect(await service.create(draft)).toEqual({ ok: false, error: { code: 'limitReached' } })
    await service.archive(first.id)
    expect((await service.create(draft)).ok).toBe(true)
  })

  it('puts the item back on review when it is edited or gets a new photo', async () => {
    const service = await make(5)
    const item = await created(service)
    const edited = await service.update(item.id, { ...draft, title: 'Corte e barba' })
    expect(edited).toMatchObject({ ok: true, value: { title: 'Corte e barba', status: 'pending' } })
    const photo = await service.uploadPhoto(item.id, upload)
    expect(photo.ok && photo.value.photoUrl).toBeTruthy()
  })

  it('refuses to edit or change the photo of an archived item, and to unarchive an active one', async () => {
    const service = await make(5)
    const item = await created(service)
    expect(await service.unarchive(item.id)).toEqual({ ok: false, error: { code: 'invalidTransition' } })
    await service.archive(item.id)
    expect(await service.update(item.id, draft)).toEqual({ ok: false, error: { code: 'invalidTransition' } })
    expect(await service.uploadPhoto(item.id, upload)).toEqual({ ok: false, error: { code: 'invalidTransition' } })
  })

  it('unarchives back to review while there is room, and refuses at the cap', async () => {
    const service = await make(1)
    const item = await created(service)
    await service.archive(item.id)
    await created(service)
    expect(await service.unarchive(item.id)).toEqual({ ok: false, error: { code: 'limitReached' } })
  })

  it('answers notFound for an unknown item', async () => {
    const service = await make(5)
    const unknown = '0190b0c0-0000-7000-8000-000000000000'
    expect(await service.update(unknown, draft)).toEqual({ ok: false, error: { code: 'notFound', entity: 'hitItem' } })
    expect(await service.archive(unknown)).toEqual({ ok: false, error: { code: 'notFound', entity: 'hitItem' } })
  })

  it('lists what was created with the cap', async () => {
    const service = await make(3)
    await created(service)
    const list = await service.list()
    expect(list.ok && list.value.cap).toBe(3)
    expect(list.ok && list.value.items).toHaveLength(1)
  })
}
