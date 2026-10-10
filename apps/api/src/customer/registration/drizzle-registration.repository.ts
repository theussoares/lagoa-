import { Inject, Injectable } from '@nestjs/common'
import { ensureAppUser } from '../../accounts/app-user.writer'
import { DB, type Database } from '../../database/database.module'
import { customerProfiles } from '../../database/schema'
import { uniqueViolationConstraint } from '../../database/unique-violation'
import { type NewCustomer, type RegistrationOutcome, RegistrationRepository } from './registration.repository'

const OUTCOME_BY_CONSTRAINT: Readonly<Record<string, RegistrationOutcome>> = {
  customer_profiles_pkey: 'alreadyRegistered',
  app_users_email_hash_unique: 'emailTaken',
  app_users_phone_hash_unique: 'phoneTaken',
  customer_profiles_referral_code_unique: 'referralCodeTaken',
}

@Injectable()
export class DrizzleRegistrationRepository extends RegistrationRepository {
  constructor(@Inject(DB) private readonly db: Database) {
    super()
  }

  async register(customer: NewCustomer): Promise<RegistrationOutcome> {
    try {
      await this.db.transaction(async (tx) => {
        // Quem já é lojista tem `app_users`: aproveita a linha (e o celular que ela guarda) e cria só o perfil.
        await ensureAppUser(tx, customer)
        await tx.insert(customerProfiles).values({ userId: customer.userId, firstName: customer.firstName, referralCode: customer.referralCode })
      })
      return 'created'
    } catch (error) {
      const constraint = uniqueViolationConstraint(error)
      const outcome = constraint === null ? undefined : OUTCOME_BY_CONSTRAINT[constraint]
      if (outcome === undefined) throw error
      return outcome
    }
  }
}
