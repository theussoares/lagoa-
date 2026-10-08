import { describe, expect, it } from 'vitest'
import { Clock } from '../../common/clock'
import { TEST_USER } from '../../test-support/fake-auth.guard'
import { CARD_ID, FakeShopJoinRepository, joinableShop, SHOP_ID } from './shop-join.fixtures'
import { ShopJoinService } from './shop-join.service'

const NOW = new Date('2026-10-03T12:00:00Z')
const clock: Clock = { now: () => NOW }
const serviceFor = (repository: FakeShopJoinRepository) => new ShopJoinService(repository, clock)

describe('ShopJoinService', () => {
  it('creates the card and answers alreadyMember false', async () => {
    const repository = new FakeShopJoinRepository()
    expect(await serviceFor(repository).joinShop(TEST_USER.id, 'NAV4K7')).toEqual({ ok: true, value: { shopId: SHOP_ID, cardId: CARD_ID, alreadyMember: false } })
    expect(repository.joins).toEqual([{ customerId: TEST_USER.id, shop: joinableShop(), now: NOW }])
  })

  it('normalizes what people type before looking the shop up', async () => {
    const repository = new FakeShopJoinRepository()
    await serviceFor(repository).joinShop(TEST_USER.id, ' nav-4k7 ')
    expect(repository.lookedUp).toEqual(['NAV4K7'])
  })

  it.each(['', '123', 'IIIIII', 'NAV4K7X'])('answers invalidShopQr for a code that cannot exist (%s) without a lookup', async (code) => {
    const repository = new FakeShopJoinRepository()
    expect(await serviceFor(repository).joinShop(TEST_USER.id, code)).toEqual({ ok: false, error: { code: 'invalidShopQr' } })
    expect(repository.lookedUp).toHaveLength(0)
  })

  it('answers invalidShopQr when no approved shop has that code', async () => {
    const repository = new FakeShopJoinRepository(null)
    expect(await serviceFor(repository).joinShop(TEST_USER.id, 'NAV4K7')).toEqual({ ok: false, error: { code: 'invalidShopQr' } })
    expect(repository.joins).toHaveLength(0)
  })

  it('answers checkInDisabled and writes nothing when the shop does not accept joining', async () => {
    const repository = new FakeShopJoinRepository(joinableShop({ joinEnabled: false }))
    expect(await serviceFor(repository).joinShop(TEST_USER.id, 'NAV4K7')).toEqual({ ok: false, error: { code: 'checkInDisabled' } })
    expect(repository.joins).toHaveLength(0)
  })

  it('answers alreadyMember without writing, even when joining is off (RN-02)', async () => {
    const repository = new FakeShopJoinRepository(joinableShop({ joinEnabled: false }))
    repository.existingCardId = CARD_ID
    expect(await serviceFor(repository).joinShop(TEST_USER.id, 'NAV4K7')).toEqual({ ok: true, value: { shopId: SHOP_ID, cardId: CARD_ID, alreadyMember: true } })
    expect(repository.joins).toHaveLength(0)
  })

  it('turns a lost race (card created by another request) into alreadyMember', async () => {
    const repository = new FakeShopJoinRepository()
    repository.created = false
    expect(await serviceFor(repository).joinShop(TEST_USER.id, 'NAV4K7')).toMatchObject({ ok: true, value: { alreadyMember: true } })
  })
})
