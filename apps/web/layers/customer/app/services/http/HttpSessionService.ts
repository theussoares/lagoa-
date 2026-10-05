import { CustomerSessionSchema } from '#shared/schemas/session'
import { err, ok } from '#shared/types/result'
import { hasCode, isTransportError } from '#layers/core/app/utils/domainError'
import type { ApiClient } from '#layers/core/app/services/http/ApiClient'
import type { SessionService } from '../SessionService'

export class HttpSessionService implements SessionService {
  constructor(private readonly api: ApiClient) {}

  async restore() {
    const result = await this.api.get('/session', CustomerSessionSchema)
    if (result.ok) return ok(result.value)
    if (hasCode(result.error, ['unauthorized', 'notFound'])) return ok(null)
    return err(isTransportError(result.error) ? result.error : { code: 'internal' as const })
  }
}
