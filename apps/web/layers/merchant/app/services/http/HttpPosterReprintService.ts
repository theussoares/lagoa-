import { ok, type Result } from '#shared/types/result'
import type { PosterReprintError, PosterReprintService } from '../PosterReprintService'

export class HttpPosterReprintService implements PosterReprintService {
  async isPending(): Promise<Result<boolean, PosterReprintError>> {
    return ok(false)
  }

  async markPrinted(): Promise<Result<boolean, PosterReprintError>> {
    return ok(false)
  }
}
