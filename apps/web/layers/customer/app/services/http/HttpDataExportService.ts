import { DataExportSchema } from '#shared/schemas/dataExport'
import { transportOnly, type ApiClient } from '#layers/core/app/services/http/ApiClient'
import type { DataExportService } from '../DataExportService'

export class HttpDataExportService implements DataExportService {
  constructor(private readonly api: ApiClient) {}

  async exportMyData() {
    return transportOnly(await this.api.get('/data-export', DataExportSchema))
  }
}
