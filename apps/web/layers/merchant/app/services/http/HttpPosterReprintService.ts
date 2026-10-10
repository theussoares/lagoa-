import { z } from 'zod'
import { allowing, type ApiClient } from '#layers/core/app/services/http/ApiClient'
import { ok, type Result } from '#shared/types/result'
import type { PosterReprintError, PosterReprintService } from '../PosterReprintService'

const PendingSchema = z.object({ pending: z.boolean() })

export class HttpPosterReprintService implements PosterReprintService {
  constructor(private readonly api: ApiClient) {}

  async isPending(): Promise<Result<boolean, PosterReprintError>> {
    const res = allowing('unauthorized')(await this.api.get('/merchant/shop/poster-reprint', PendingSchema))
    return res.ok ? ok(res.value.pending) : res
  }

  async markPrinted(): Promise<Result<boolean, PosterReprintError>> {
    const res = allowing('unauthorized')(await this.api.post('/merchant/shop/poster-reprint/printed', PendingSchema))
    return res.ok ? ok(res.value.pending) : res
  }
}
