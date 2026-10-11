import { describe, expect, it, vi } from 'vitest'
import type { ClubSetupDraft } from '#shared/schemas/onboarding'
import { PhoneNumberSchema } from '#shared/schemas/phone'
import type { ShopStatus } from '#shared/schemas/shop'
import type { AuthUser } from '../../auth/auth.types'
import { TEST_USER } from '../../test-support/fake-auth.guard'
import { createTestPii } from '../../test-support/pii'
import {
  type CreateClubOutcome,
  type PosterData,
  ClubSetupRepository,
} from './club-setup.repository'
import { ClubSetupService } from './club-setup.service'

const OWNER: AuthUser = { ...TEST_USER, phone: PhoneNumberSchema.parse('67991230374') }
const NOW = new Date('2026-10-09T12:00:00Z')

const sampleDraft: ClubSetupDraft = {
  shop: { name: 'Padaria Modelo', category: 'bakery', neighborhood: 'Centro', addressLine: 'Rua Principal, 100' },
  program: {
    reward: { title: 'Pão de queijo' },
    rules: { mode: 'stamps', target: 10 },
    bonusRules: {
      welcomeBonus: { enabled: true, units: 2 },
      birthdayMultiplier: { enabled: false, multiplier: 2 },
      referralBonus: { enabled: false, units: 1 },
      surpriseDay: { enabled: false, multiplier: 2, date: null },
    },
    expirationPolicy: { kind: 'never' },
    checkIn: { enabled: true, cooldownHours: 4, cooldownMode: 'rolling' },
  },
}

class InMemoryClubSetupRepository extends ClubSetupRepository {
  shop: { id: string; status: ShopStatus; name: string } | null = null
  poster: PosterData | null = null
  phoneTaken = false
  posterReprinted = false
  lastOwner: Parameters<ClubSetupRepository['createClub']>[0] | null = null

  async createClub(owner: Parameters<ClubSetupRepository['createClub']>[0], draft: ClubSetupDraft, newCheckInCode: () => string): Promise<CreateClubOutcome> {
    this.lastOwner = owner
    if (this.phoneTaken) return { kind: 'phoneTaken' }
    if (this.shop) return { kind: 'existing', club: { shopId: this.shop.id, shopName: this.shop.name, shopStatus: this.shop.status, merchantTermsVersion: null } }
    this.shop = { id: '018f98a2-7b2a-7182-9f33-6d004bbbb999', status: 'pending', name: draft.shop.name }
    this.posterReprinted = true
    this.poster = { shopName: draft.shop.name, status: 'pending', checkInCode: newCheckInCode(), rewardTitle: draft.program.reward.title, unit: 'stamp', target: 10 }
    return { kind: 'created', club: { shopId: this.shop.id, shopName: this.shop.name, shopStatus: 'pending', merchantTermsVersion: null } }
  }

  async getPoster(): Promise<PosterData | null> {
    return this.poster
  }

  async getStatus(): Promise<ShopStatus | null> {
    return this.shop?.status ?? null
  }

  async approveShop(): Promise<ShopStatus | null> {
    if (!this.shop) return null
    this.shop.status = 'approved'
    if (this.poster) this.poster = { ...this.poster, status: 'approved' }
    return 'approved'
  }

  async isPosterReprintPending(): Promise<boolean | null> {
    return this.shop ? !this.posterReprinted : null
  }

  async markPosterReprinted(): Promise<boolean | null> {
    if (!this.shop) return null
    this.posterReprinted = true
    return false
  }
}

function setup() {
  const repo = new InMemoryClubSetupRepository()
  return { repo, service: new ClubSetupService(repo, createTestPii(), { now: () => NOW }) }
}

describe('ClubSetupService', () => {
  it('creates the club and reports it as new', async () => {
    const { service } = setup()
    expect(await service.createClub(OWNER, sampleDraft)).toEqual({
      ok: true,
      value: {
        created: true,
        session: { role: 'merchant', merchantId: TEST_USER.id, shopId: '018f98a2-7b2a-7182-9f33-6d004bbbb999', shopName: 'Padaria Modelo', shopStatus: 'pending', termsAccepted: false },
      },
    })
  })

  it('is idempotent: a second call returns the existing shop without applying the new draft', async () => {
    const { service } = setup()
    await service.createClub(OWNER, sampleDraft)
    const again = await service.createClub(OWNER, { ...sampleDraft, shop: { ...sampleDraft.shop, name: 'Outro nome' } })
    expect(again).toMatchObject({ ok: true, value: { created: false, session: { shopName: 'Padaria Modelo' } } })
  })

  it('needs the phone confirmed by SMS, taken from the token and never from the body', async () => {
    const { service, repo } = setup()
    expect(await service.createClub(TEST_USER, sampleDraft)).toEqual({ ok: false, error: { code: 'unauthorized' } })
    expect(repo.lastOwner).toBeNull()
  })

  it('stores the phone encrypted and hashed, never in the clear', async () => {
    const { service, repo } = setup()
    await service.createClub(OWNER, sampleDraft)
    expect(repo.lastOwner?.phoneEncrypted.toString('utf8')).not.toContain('67991230374')
    expect(repo.lastOwner?.phoneHash.length).toBeGreaterThan(0)
    // O e-mail do token nunca é gravado: o painel não o usa e e-mail único faria o Criar o clube falhar.
    expect(repo.lastOwner).toMatchObject({ emailEncrypted: null, emailHash: null })
  })

  it('answers phoneAlreadyUsed when the phone belongs to another account', async () => {
    const { service, repo } = setup()
    repo.phoneTaken = true
    expect(await service.createClub(OWNER, sampleDraft)).toEqual({ ok: false, error: { code: 'phoneAlreadyUsed' } })
  })

  it('retrieves poster data for the shop', async () => {
    const { service } = setup()
    await service.createClub(OWNER, sampleDraft)
    const poster = await service.getPoster(TEST_USER.id)
    expect(poster).toMatchObject({ ok: true, value: { shopName: 'Padaria Modelo', status: 'pending', rewardTitle: 'Pão de queijo', unit: 'stamp', target: 10 } })
    expect(poster.ok && poster.value.checkInCode).toHaveLength(6)
  })

  it('returns shop status and allows test approval outside production', async () => {
    const { service } = setup()
    await service.createClub(OWNER, sampleDraft)
    expect(await service.getStatus(TEST_USER.id)).toEqual({ ok: true, value: 'pending' })
    vi.stubEnv('ENABLE_TEST_APPROVE', '1')
    const approved = await service.testApprove(TEST_USER.id)
    vi.unstubAllEnvs()
    expect(approved).toEqual({ ok: true, value: 'approved' })
    expect(await service.getStatus(TEST_USER.id)).toEqual({ ok: true, value: 'approved' })
  })

  it('refuses test approval unless ENABLE_TEST_APPROVE is on', async () => {
    const { service } = setup()
    await service.createClub(OWNER, sampleDraft)
    expect(await service.testApprove(TEST_USER.id)).toEqual({ ok: false, error: { code: 'unauthorized' } })
    expect(await service.getStatus(TEST_USER.id)).toEqual({ ok: true, value: 'pending' })
  })

  it('a new shop has no poster reprint pending, and marking it printed is idempotent', async () => {
    const { service, repo } = setup()
    await service.createClub(OWNER, sampleDraft)
    expect(await service.isPosterReprintPending(TEST_USER.id)).toEqual({ ok: true, value: false })
    repo.posterReprinted = false
    expect(await service.isPosterReprintPending(TEST_USER.id)).toEqual({ ok: true, value: true })
    expect(await service.markPosterReprinted(TEST_USER.id)).toEqual({ ok: true, value: false })
    expect(await service.markPosterReprinted(TEST_USER.id)).toEqual({ ok: true, value: false })
  })

  it('answers notFound(shop) to a user without a shop', async () => {
    const { service } = setup()
    expect(await service.isPosterReprintPending(TEST_USER.id)).toEqual({ ok: false, error: { code: 'notFound', entity: 'shop' } })
    expect(await service.getStatus(TEST_USER.id)).toMatchObject({ ok: false })
  })
})
