import type { DataExport } from '#shared/schemas/dataExport'
import type { TransportError } from '#shared/types/errors'
import type { Result } from '#shared/types/result'

export interface DataExportService {
  /** Direito de acesso (LGPD): tudo que o app guarda sobre a pessoa, só dela. */
  exportMyData(): Promise<Result<DataExport, TransportError>>
}
