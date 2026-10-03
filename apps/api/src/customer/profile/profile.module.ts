import { Module } from '@nestjs/common'
import { DrizzleProfileRepository } from './drizzle-profile.repository'
import { ProfileController } from './profile.controller'
import { ProfileRepository } from './profile.repository'
import { ProfileService } from './profile.service'

@Module({
  controllers: [ProfileController],
  providers: [ProfileService, { provide: ProfileRepository, useClass: DrizzleProfileRepository }],
  exports: [ProfileRepository],
})
export class ProfileModule {}
