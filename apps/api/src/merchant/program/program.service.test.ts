import { describe, expect, it } from 'vitest'
import type { Program, ProgramDraft } from '#shared/schemas/program'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import { ProgramRepository, type ActiveProgramData } from './program.repository'
import { ProgramService } from './program.service'

class FakeProgramRepository extends ProgramRepository {
  data: ActiveProgramData | null = null
  cardCount = 0
  savedDrafts: Array<{ draft: ProgramDraft; isNewVersion: boolean }> = []

  async findActiveProgramByOwner(_ownerUserId: string): Promise<ActiveProgramData | null> {
    return this.data
  }

  async countCardsByShopId(_shopId: string): Promise<number> {
    return this.cardCount
  }

  async updateActiveProgram(
    _ownerUserId: string,
    draft: ProgramDraft,
    decide: (current: Program, cardsCount: number) => Result<{ isNewVersion: boolean }, ErrorOf<'programModeLocked'>>,
  ): Promise<Result<Program, ErrorOf<'notFound' | 'programModeLocked'>>> {
    if (!this.data) return err({ code: 'notFound', entity: 'program' })
    const decision = decide(this.data.program, this.cardCount)
    if (!decision.ok) return decision
    const { isNewVersion } = decision.value
    this.savedDrafts.push({ draft, isNewVersion })
    const updated: Program = {
      id: isNewVersion ? '018f98a2-7b2a-7182-9f33-6d004bbbb999' as any : this.data.program.id,
      shopId: this.data.shopId as any,
      reward: draft.reward,
      rules: draft.rules,
      bonusRules: draft.bonusRules,
      expirationPolicy: draft.expirationPolicy,
      checkIn: draft.checkIn,
    }
    this.data.program = updated
    return ok(updated)
  }
}

describe('ProgramService', () => {
  const baseProgram: Program = {
    id: '018f98a2-7b2a-7182-9f33-6d004bbbb111' as any,
    shopId: '018f98a2-7b2a-7182-9f33-6d004bbbb222' as any,
    reward: { title: 'Café grátis' },
    rules: { mode: 'stamps', target: 10 },
    bonusRules: {
      welcomeBonus: { enabled: true, units: 1 },
      birthdayMultiplier: { enabled: false, multiplier: 2 },
      referralBonus: { enabled: true, units: 1 },
      surpriseDay: { enabled: false, multiplier: 2, date: null },
    },
    expirationPolicy: { kind: 'never' },
    checkIn: { enabled: true, cooldownHours: 24 },
  }

  const baseDraft: ProgramDraft = {
    reward: { title: 'Café grátis' },
    rules: { mode: 'stamps', target: 10 },
    bonusRules: {
      welcomeBonus: { enabled: true, units: 1 },
      birthdayMultiplier: { enabled: false, multiplier: 2 },
      referralBonus: { enabled: true, units: 1 },
      surpriseDay: { enabled: false, multiplier: 2, date: null },
    },
    expirationPolicy: { kind: 'never' },
    checkIn: { enabled: true, cooldownHours: 24 },
  }

  it('getProgram returns active program for existing shop', async () => {
    const repo = new FakeProgramRepository()
    repo.data = { shopId: baseProgram.shopId, program: baseProgram }
    const service = new ProgramService(repo)

    const result = await service.getProgram('user-1')
    expect(result).toEqual({ ok: true, value: baseProgram })
  })

  it('getProgram returns notFound when shop or program does not exist', async () => {
    const repo = new FakeProgramRepository()
    repo.data = null
    const service = new ProgramService(repo)

    const result = await service.getProgram('user-1')
    expect(result).toEqual({ ok: false, error: { code: 'notFound', entity: 'program' } })
  })

  it('countActiveCards returns card count', async () => {
    const repo = new FakeProgramRepository()
    repo.data = { shopId: baseProgram.shopId, program: baseProgram }
    repo.cardCount = 42
    const service = new ProgramService(repo)

    const result = await service.countActiveCards('user-1')
    expect(result).toEqual({ ok: true, value: { count: 42 } })
  })

  it('countActiveCards returns notFound if shop does not exist', async () => {
    const repo = new FakeProgramRepository()
    repo.data = null
    const service = new ProgramService(repo)

    const result = await service.countActiveCards('user-1')
    expect(result).toEqual({ ok: false, error: { code: 'notFound', entity: 'shop' } })
  })

  it('updateProgram refuses mode change with programModeLocked when cards > 0', async () => {
    const repo = new FakeProgramRepository()
    repo.data = { shopId: baseProgram.shopId, program: baseProgram }
    repo.cardCount = 5
    const service = new ProgramService(repo)

    const draftWithModeChange: ProgramDraft = {
      ...baseDraft,
      rules: { mode: 'pointsPerVisit', pointsPerVisit: 10, target: 100 },
    }

    const result = await service.updateProgram('user-1', draftWithModeChange)
    expect(result).toEqual({ ok: false, error: { code: 'programModeLocked' } })
    expect(repo.savedDrafts).toHaveLength(0)
  })

  it('updateProgram allows mode change when cards == 0', async () => {
    const repo = new FakeProgramRepository()
    repo.data = { shopId: baseProgram.shopId, program: baseProgram }
    repo.cardCount = 0
    const service = new ProgramService(repo)

    const draftWithModeChange: ProgramDraft = {
      ...baseDraft,
      rules: { mode: 'pointsPerVisit', pointsPerVisit: 10, target: 100 },
    }

    const result = await service.updateProgram('user-1', draftWithModeChange)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.rules.mode).toBe('pointsPerVisit')
    expect(repo.savedDrafts).toHaveLength(1)
    expect(repo.savedDrafts[0]?.isNewVersion).toBe(true)
  })

  it('updateProgram allows target change even when active cards exist', async () => {
    const repo = new FakeProgramRepository()
    repo.data = { shopId: baseProgram.shopId, program: baseProgram }
    repo.cardCount = 15
    const service = new ProgramService(repo)

    const draftWithNewTarget: ProgramDraft = {
      ...baseDraft,
      rules: { mode: 'stamps', target: 12 },
    }

    const result = await service.updateProgram('user-1', draftWithNewTarget)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.rules.target).toBe(12)
    expect(repo.savedDrafts).toHaveLength(1)
    expect(repo.savedDrafts[0]?.isNewVersion).toBe(true)
  })

  it('updateProgram marks isNewVersion=false when only reward title changed', async () => {
    const repo = new FakeProgramRepository()
    repo.data = { shopId: baseProgram.shopId, program: baseProgram }
    repo.cardCount = 8
    const service = new ProgramService(repo)

    const draftWithTitleOnly: ProgramDraft = {
      ...baseDraft,
      reward: { title: 'Café expresso especial' },
    }

    const result = await service.updateProgram('user-1', draftWithTitleOnly)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.reward.title).toBe('Café expresso especial')
    expect(repo.savedDrafts).toHaveLength(1)
    expect(repo.savedDrafts[0]?.isNewVersion).toBe(false)
  })

  it('updateProgram returns notFound if merchant has no active program', async () => {
    const repo = new FakeProgramRepository()
    repo.data = null
    const service = new ProgramService(repo)

    const result = await service.updateProgram('user-1', baseDraft)
    expect(result).toEqual({ ok: false, error: { code: 'notFound', entity: 'program' } })
  })
})
