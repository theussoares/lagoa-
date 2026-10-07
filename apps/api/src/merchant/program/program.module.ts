import { Module } from '@nestjs/common'
import { DrizzleProgramRepository } from './drizzle-program.repository'
import { ProgramController } from './program.controller'
import { ProgramRepository } from './program.repository'
import { ProgramService } from './program.service'

@Module({
  controllers: [ProgramController],
  providers: [
    ProgramService,
    {
      provide: ProgramRepository,
      useClass: DrizzleProgramRepository,
    },
  ],
  exports: [ProgramService, ProgramRepository],
})
export class ProgramModule {}
