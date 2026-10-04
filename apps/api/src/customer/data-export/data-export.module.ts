import { Module } from '@nestjs/common'
import { ProfileModule } from '../profile/profile.module'
import { DataExportController } from './data-export.controller'
import { DataExportRepository } from './data-export.repository'
import { DataExportService } from './data-export.service'
import { DrizzleDataExportRepository } from './drizzle-data-export.repository'

@Module({
  imports: [ProfileModule],
  controllers: [DataExportController],
  providers: [DataExportService, { provide: DataExportRepository, useClass: DrizzleDataExportRepository }],
})
export class DataExportModule {}
