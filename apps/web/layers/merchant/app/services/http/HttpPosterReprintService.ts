import { z } from 'zod'
import { allowing, type ApiClient } from '#layers/core/app/services/http/ApiClient'
import { ok, type Result } from '#shared/types/result'
import type { PosterReprintError, PosterReprintService } from '../PosterReprintService'

const PendingSchema = z.object({ pending: z.boolean() })

export class HttpPosterReprintService implements PosterReprintService {
  constructor(private readonly api: ApiClient) {}

  async isPending(): Promise<Result<boolean, PosterReprintError>> {
    return this.pending(await this.api.get('/merchant/shop/poster-reprint', PendingSchema))
  }

  async markPrinted(): Promise<Result<boolean, PosterReprintError>> {
    return this.pending(await this.api.post('/merchant/shop/poster-reprint/printed', PendingSchema))
  }

  private pending(res: Awaited<ReturnType<ApiClient['get']>>): Result<boolean, PosterReprintError> {
    const checked = allowing('unauthorized')(res)
    if (!checked.ok) return checked
    return ok(PendingSchema.parse(checked.value).pending)
  }
}
