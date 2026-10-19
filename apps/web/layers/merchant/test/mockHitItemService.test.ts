import { describe, expect, it } from 'vitest'
import { MockHitItemService } from '../app/services/mock/MockHitItemService'
import { describeHitItemContract, draft } from './hitItemContract'

describe('MockHitItemService', () => {
  describeHitItemContract((cap) => new MockHitItemService({ cap }))

  it('puts an approved item back to pending when edited, clearing nothing else', async () => {
    const seeded = await new MockHitItemService({ cap: 5 }).create(draft)
    if (!seeded.ok) throw new Error('seed')
    const service = new MockHitItemService({ cap: 5, seed: [{ ...seeded.value, status: 'approved' }] })
    const edited = await service.update(seeded.value.id, { ...draft, priceCents: 5000 })
    expect(edited).toMatchObject({ ok: true, value: { status: 'pending', priceCents: 5000 } })
  })

  it('clears the rejection reason when the item is edited again', async () => {
    const seeded = await new MockHitItemService({ cap: 5 }).create(draft)
    if (!seeded.ok) throw new Error('seed')
    const service = new MockHitItemService({ cap: 5, seed: [{ ...seeded.value, status: 'rejected', rejectionReason: 'Foto escura' }] })
    const edited = await service.update(seeded.value.id, draft)
    expect(edited).toMatchObject({ ok: true, value: { status: 'pending', rejectionReason: null } })
  })
})
