import { Injectable, Logger } from '@nestjs/common'
import { toProgramRules } from '../../programs/program-rules.mapper'
import { Clock } from '../../common/clock'
import { PiiService } from '../../common/pii.service'
import { generateReadableCode } from '../../common/readable-code'
import { ReferralSettlement } from '../../ledger/referral-settlement'
import type { PhoneNumber } from '#shared/schemas/phone'
import type { CounterEntry, VisitRegistered } from '#shared/schemas/visit'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import { parsePhoneNumber } from '#shared/utils/phone'
import type { EarnInput } from '#shared/domain/programStrategies'
import { REFERRAL_CODE_LENGTH } from '#shared/constants/domain'
import { CounterRepository } from './counter.repository'
import { assertOperationalShop, type RegisterVisitRuleError, validateRegisterInput } from './counter.rules'

export type RegisterVisitServiceError =
  | RegisterVisitRuleError
  | ErrorOf<'invalidPhone' | 'notFound' | 'invalidProgram'>

@Injectable()
export class CounterService {
  private readonly logger = new Logger(CounterService.name)

  constructor(
    private readonly repo: CounterRepository,
    private readonly clock: Clock,
    private readonly pii: PiiService,
    private readonly referrals: ReferralSettlement,
  ) {}

  async registerVisit(
    ownerUserId: string,
    phoneInput: PhoneNumber | string,
    input: EarnInput,
  ): Promise<Result<VisitRegistered, RegisterVisitServiceError>> {
    const parsedPhone = parsePhoneNumber(phoneInput)
    if (!parsedPhone.ok) return err({ code: 'invalidPhone' })
    const phone = parsedPhone.value

    const shop = await this.repo.findShopAndProgramByOwner(ownerUserId)
    if (!shop) return err({ code: 'notFound', entity: 'merchant' })

    const shopOperational = assertOperationalShop(shop.shopStatus)
    if (!shopOperational.ok) return shopOperational

    const rules = toProgramRules({ mode: shop.mode, earnUnits: shop.earnUnits, target: shop.target })
    if (!rules.ok) return rules

    const inputValid = validateRegisterInput(rules.value, input)
    if (!inputValid.ok) return inputValid

    const now = this.clock.now()
    const phoneHash = this.pii.hashPhone(phone)
    const phoneEncrypted = this.pii.encrypt(phone)
    const referralCode = generateReadableCode(REFERRAL_CODE_LENGTH)

    const customer = await this.repo.resolveOrCreateCustomer(phone, phoneHash, phoneEncrypted, referralCode)

    const { visit, isFirstVisit } = await this.repo.recordVisit(shop, customer, input, ownerUserId, now)

    if (isFirstVisit) {
      try {
        await this.referrals.settlePending(customer.customerId, shop.shopId, now)
      } catch (error) {
        this.logger.error(`Referral settlement failed for customer ${customer.customerId} in shop ${shop.shopId}`, error)
      }
    }

    return ok(visit)
  }

  async listTodayEntries(ownerUserId: string): Promise<Result<CounterEntry[], ErrorOf<'notFound'>>> {
    const shop = await this.repo.findShopAndProgramByOwner(ownerUserId)
    if (!shop) return err({ code: 'notFound', entity: 'merchant' })

    const now = this.clock.now()
    const startOfDay = new Date(now)
    startOfDay.setHours(0, 0, 0, 0)

    const entries = await this.repo.listTodayEntries(shop.shopId, startOfDay)
    return ok(entries)
  }
}
