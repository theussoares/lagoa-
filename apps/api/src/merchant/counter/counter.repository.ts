import type { BonusRules, ProgramMode, ProgramUnit } from '#shared/schemas/program'
import type { ShopStatus } from '#shared/schemas/shop'
import type { CounterEntry, VisitRegistered } from '#shared/schemas/visit'
import type { EarnInput } from '#shared/domain/programStrategies'

export interface ShopWithProgram {
  readonly shopId: string
  readonly shopName: string
  readonly shopStatus: ShopStatus
  readonly programId: string
  readonly rewardTitle: string
  readonly mode: ProgramMode
  readonly unit: ProgramUnit
  readonly earnPer: 'visit' | 'real'
  readonly earnUnits: number
  readonly target: number
  readonly bonusRules: BonusRules
  readonly expirationKind: 'never' | 'afterInactivity'
  readonly expirationMonths: number | null
  readonly checkInCooldownHours: number
}

export interface ResolvedCustomer {
  readonly customerId: string
  readonly birthday: string | null
  readonly isNewCustomer: boolean
  readonly phone: string
}

export abstract class CounterRepository {
  abstract findShopAndProgramByOwner(ownerUserId: string): Promise<ShopWithProgram | null>
  abstract resolveOrCreateCustomer(
    phone: string,
    phoneHash: Buffer,
    phoneEncrypted: Buffer,
    referralCode: string,
  ): Promise<ResolvedCustomer>
  abstract recordVisit(
    shop: ShopWithProgram,
    customer: ResolvedCustomer,
    input: EarnInput,
    merchantUserId: string,
    now: Date,
  ): Promise<{ visit: VisitRegistered; isFirstVisit: boolean }>
  abstract listTodayEntries(shopId: string, startOfDay: Date): Promise<CounterEntry[]>
}
