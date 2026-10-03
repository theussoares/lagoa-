import { Injectable } from '@nestjs/common'
import type { CustomerProfile, ProfileUpdate } from '#shared/schemas/customer'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import { Clock } from '../../common/clock'
import { PiiService } from '../../common/pii.service'
import { toCustomerProfile } from './profile.mapper'
import { type ProfileNotFound, type ProfileRecord, ProfileRepository } from './profile.repository'
import { decideConsent, decideProfileUpdate, decideTerms } from './profile.rules'

@Injectable()
export class ProfileService {
  constructor(
    private readonly repository: ProfileRepository,
    private readonly pii: PiiService,
    private readonly clock: Clock,
  ) {}

  async get(userId: string): Promise<Result<CustomerProfile, ProfileNotFound>> {
    const record = await this.repository.findByUserId(userId)
    return record === null ? err({ code: 'notFound', entity: 'customer' }) : ok(this.present(record))
  }

  async update(
    userId: string,
    update: ProfileUpdate,
  ): Promise<Result<CustomerProfile, ProfileNotFound | ErrorOf<'birthdayLocked'>>> {
    const now = this.clock.now()
    return this.presentResult(await this.repository.update(userId, (current) => decideProfileUpdate(current, update, now)))
  }

  async setNotificationConsent(userId: string, granted: boolean): Promise<Result<CustomerProfile, ProfileNotFound>> {
    const now = this.clock.now()
    return this.presentResult(await this.repository.update(userId, () => decideConsent(granted, now)))
  }

  async acceptTerms(userId: string): Promise<Result<CustomerProfile, ProfileNotFound>> {
    const now = this.clock.now()
    return this.presentResult(await this.repository.update(userId, (current) => decideTerms(current, now)))
  }

  private presentResult<E>(result: Result<ProfileRecord, E>): Result<CustomerProfile, E> {
    return result.ok ? ok(this.present(result.value)) : result
  }

  private present(record: ProfileRecord): CustomerProfile {
    return toCustomerProfile(record, this.pii.decrypt(record.phoneEncrypted), this.clock.now())
  }
}
