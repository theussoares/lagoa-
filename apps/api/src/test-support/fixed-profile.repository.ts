import { type ProfileRecord, ProfileRepository } from '../customer/profile/profile.repository'

/** Perfil fixo para testes de quem só lê (sessão, cadastro, guard de termos). */
export class FixedProfileRepository extends ProfileRepository {
  constructor(public record: ProfileRecord | null) {
    super()
  }
  async findByUserId(): Promise<ProfileRecord | null> {
    return this.record
  }
  async findTerms(): Promise<Pick<ProfileRecord, 'termsAcceptedAt' | 'termsVersion'> | null> {
    return this.record
  }
  async update(): Promise<never> {
    throw new Error('not used')
  }
}
