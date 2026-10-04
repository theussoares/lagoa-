import { Controller, Get } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import type { DataExport } from '#shared/schemas/dataExport'
import type { AuthUser } from '../../auth/auth.types'
import { CurrentUser } from '../../auth/current-user.decorator'
import { unwrap } from '../../common/http/domain-exception'
import { DataExportService } from './data-export.service'

@Controller('customer/data-export')
export class DataExportController {
  constructor(private readonly exports: DataExportService) {}

  /** Direito de acesso (LGPD): só os dados de quem pede; leitura pesada, por isso o limite baixo. */
  @Get()
  @Throttle({ default: { limit: 3, ttl: 60_000 }, ip: { limit: 30, ttl: 60_000 } })
  async export(@CurrentUser() user: AuthUser): Promise<DataExport> {
    return unwrap(await this.exports.export(user.id))
  }
}
