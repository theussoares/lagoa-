import { Inject, Injectable } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { err, ok, type Result } from '#shared/types/result'
import { DB, type Database } from '../../database/database.module'
import { appUsers, customerProfiles } from '../../database/schema'
import {
  type ProfileNotFound,
  type ProfilePatch,
  type ProfileRecord,
  ProfileRepository,
} from './profile.repository'

const PROFILE_COLUMNS = {
  userId: customerProfiles.userId,
  firstName: customerProfiles.firstName,
  birthday: customerProfiles.birthday,
  birthdayChangedAt: customerProfiles.birthdayChangedAt,
  notificationsConsent: customerProfiles.notificationsConsent,
  consentUpdatedAt: customerProfiles.consentUpdatedAt,
  termsAcceptedAt: customerProfiles.termsAcceptedAt,
  termsVersion: customerProfiles.termsVersion,
  phoneEncrypted: appUsers.phoneEncrypted,
}

const NOT_FOUND: ProfileNotFound = { code: 'notFound', entity: 'customer' }

@Injectable()
export class DrizzleProfileRepository extends ProfileRepository {
  constructor(@Inject(DB) private readonly db: Database) {
    super()
  }

  async findByUserId(userId: string): Promise<ProfileRecord | null> {
    const [row] = await this.db
      .select(PROFILE_COLUMNS)
      .from(customerProfiles)
      .innerJoin(appUsers, eq(appUsers.id, customerProfiles.userId))
      .where(eq(customerProfiles.userId, userId))
      .limit(1)
    return row ?? null
  }

  async findTerms(userId: string): Promise<Pick<ProfileRecord, 'termsAcceptedAt' | 'termsVersion'> | null> {
    const [row] = await this.db
      .select({ termsAcceptedAt: customerProfiles.termsAcceptedAt, termsVersion: customerProfiles.termsVersion })
      .from(customerProfiles)
      .where(eq(customerProfiles.userId, userId))
      .limit(1)
    return row ?? null
  }

  async update<E>(
    userId: string,
    decide: (current: ProfileRecord) => Result<ProfilePatch, E>,
  ): Promise<Result<ProfileRecord, E | ProfileNotFound>> {
    return this.db.transaction(async (tx) => {
      const [current] = await tx
        .select(PROFILE_COLUMNS)
        .from(customerProfiles)
        .innerJoin(appUsers, eq(appUsers.id, customerProfiles.userId))
        .where(eq(customerProfiles.userId, userId))
        .limit(1)
        .for('update', { of: customerProfiles })
      if (!current) return err(NOT_FOUND)

      const decision = decide(current)
      if (!decision.ok) return err(decision.error)
      if (Object.keys(decision.value).length === 0) return ok(current)

      await tx.update(customerProfiles).set(decision.value).where(eq(customerProfiles.userId, userId))
      return ok({ ...current, ...decision.value })
    })
  }
}
