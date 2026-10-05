import type { z } from 'zod'
import type { DomainError, DomainErrorCode, ErrorOf, TransportError } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import type { ApiClientDeps, ApiRequestOptions, ApiResult } from '../../types/http'
import { hasCode, isTransportError, parseDomainError } from '../../utils/domainError'

/** Fala com `/v1` da API (pelo BFF, que põe o token): devolve `Result` e valida toda resposta pelo schema do `shared`. */
export class ApiClient {
  constructor(private readonly deps: ApiClientDeps) {}

  get<S extends z.ZodType>(path: string, schema: S): Promise<ApiResult<z.infer<S>>> {
    return this.send('GET', path, schema)
  }

  post<S extends z.ZodType>(path: string, schema: S, options?: ApiRequestOptions): Promise<ApiResult<z.infer<S>>> {
    return this.send('POST', path, schema, options)
  }

  put<S extends z.ZodType>(path: string, schema: S, options?: ApiRequestOptions): Promise<ApiResult<z.infer<S>>> {
    return this.send('PUT', path, schema, options)
  }

  delete<S extends z.ZodType>(path: string, schema: S): Promise<ApiResult<z.infer<S>>> {
    return this.send('DELETE', path, schema)
  }

  private async send<S extends z.ZodType>(method: string, path: string, schema: S, options: ApiRequestOptions = {}): Promise<ApiResult<z.infer<S>>> {
    const response = await this.request(method, path, options)
    if (!response.ok) return response
    if (!response.value.ok) {
      const error = parseDomainError(await response.value.json().catch(() => null))
      if (error.code === 'unauthorized') this.deps.onUnauthorized()
      return err(error)
    }
    const body: unknown = response.value.status === 204 ? undefined : await response.value.json().catch(() => undefined)
    const parsed = schema.safeParse(body)
    return parsed.success ? ok(parsed.data) : err({ code: 'internal' })
  }

  private async request(method: string, path: string, options: ApiRequestOptions): Promise<Result<Response, DomainError>> {
    try {
      const response = await this.deps.fetcher(`${this.deps.baseUrl}${path}`, {
        method,
        headers: {
          ...(options.body === undefined ? {} : { 'content-type': 'application/json' }),
          ...options.headers,
        },
        ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
      })
      return ok(response)
    } catch {
      return err({ code: 'network' })
    }
  }
}

/** Para chamadas sem erro de regra de negócio: só falha de transporte. */
export function transportOnly<T>(result: ApiResult<T>): Result<T, TransportError> {
  if (result.ok) return result
  return isTransportError(result.error) ? err(result.error) : err({ code: 'internal' })
}

/** Mantém só os erros que o contrato do service declara; o resto da API vira `internal` em vez de vazar um código inesperado. */
export function allowing<C extends DomainErrorCode>(...codes: readonly C[]) {
  return <T>(result: ApiResult<T>): Result<T, ErrorOf<C> | TransportError> => {
    if (result.ok) return result
    if (isTransportError(result.error) || hasCode(result.error, codes)) return err(result.error)
    return err({ code: 'internal' })
  }
}
