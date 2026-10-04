import { Module } from '@nestjs/common'
import { DrizzleProfileRepository } from './drizzle-profile.repository'
import { ProfileController } from './profile.controller'
import { ProfileRepository } from './profile.repository'
import { ProfileService } from './profile.service'
import { TermsGuard } from './terms.guard'

@Module({
  controllers: [ProfileController],
  providers: [ProfileService, TermsGuard, { provide: ProfileRepository, useClass: DrizzleProfileRepository }],
  exports: [ProfileRepository, TermsGuard],
})
export class ProfileModule {}
