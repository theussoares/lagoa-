import { allowing, type ApiClient } from '#layers/core/app/services/http/ApiClient'
import type { VisitQrId } from '#shared/schemas/ids'
import {
  IssuedVisitQrSchema,
  VisitQrSchema,
  type VisitQrIssueRequest,
} from '#shared/schemas/visitQr'
import type { VisitQrService } from '../VisitQrService'

export class HttpVisitQrService implements VisitQrService {
  constructor(private readonly api: ApiClient) {}

  async issueVisitQr(request: VisitQrIssueRequest) {
    const res = await this.api.post('/merchant/visit-qrs', IssuedVisitQrSchema, { body: request })
    return allowing('invalidAmount', 'amountNotAccepted', 'visitQrLimitReached', 'shopPendingApproval', 'shopSuspended', 'merchantTermsNotAccepted')(res)
  }

  async getVisitQr(id: VisitQrId) {
    const res = await this.api.get(`/merchant/visit-qrs/${encodeURIComponent(id)}`, VisitQrSchema)
    return allowing('notFound', 'shopPendingApproval', 'shopSuspended')(res)
  }

  async cancelVisitQr(id: VisitQrId) {
    const res = await this.api.post(`/merchant/visit-qrs/${encodeURIComponent(id)}/cancel`, VisitQrSchema)
    return allowing('notFound', 'shopPendingApproval', 'shopSuspended')(res)
  }
}
