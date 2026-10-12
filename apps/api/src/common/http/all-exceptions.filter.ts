import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, Logger } from '@nestjs/common'
import type { Request, Response } from 'express'
import type { SecurityEventName } from '#shared/types/securityEvent'
import { securityLogLine } from '#shared/utils/securityEvent'
import type { AuthUser } from '../../auth/auth.types'

const CODE_BY_STATUS: Readonly<Record<number, string>> = {
  401: 'unauthorized',
  413: 'payloadTooLarge',
  404: 'routeNotFound',
  429: 'rateLimited',
}

/** Erro 4xx do próprio Express (corpo grande demais, JSON quebrado): é do cliente, não nosso. */
function clientErrorStatus(exception: unknown): number | null {
  if (typeof exception !== 'object' || exception === null) return null
  const status = 'status' in exception ? exception.status : 'statusCode' in exception ? exception.statusCode : null
  return typeof status === 'number' && status >= 400 && status < 500 ? status : null
}

/** Recusas que viram evento de segurança (§14): token ruim, acesso negado por regra e limite atingido. */
const SECURITY_EVENT_BY_STATUS: Readonly<Record<number, SecurityEventName>> = {
  401: 'access.unauthorized',
  403: 'access.denied',
  429: 'rateLimit.hit',
}

function hasCode(body: unknown): body is { code: string } {
  return typeof body === 'object' && body !== null && 'code' in body
}

/**
 * Todo erro sai como `{ code, ... }`. Erro inesperado vira `internal` sem mensagem: a do
 * driver pode trazer valores da query (celular, e-mail), então só o nome e o código vão para o log.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions')
  private readonly securityLogger = new Logger('Security')

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp()
    const response = http.getResponse<Response>()
    if (exception instanceof HttpException) {
      const body = exception.getResponse()
      const status = exception.getStatus()
      const payload = hasCode(body) ? body : { code: CODE_BY_STATUS[status] ?? 'requestFailed' }
      this.logSecurityEvent(http.getRequest<Request & { user?: AuthUser }>(), status, payload.code)
      response.status(status).json(payload)
      return
    }
    const clientStatus = clientErrorStatus(exception)
    if (clientStatus !== null) {
      response.status(clientStatus).json({ code: CODE_BY_STATUS[clientStatus] ?? 'requestFailed' })
      return
    }
    const name = exception instanceof Error ? exception.name : typeof exception
    const pgCode = typeof exception === 'object' && exception !== null && 'code' in exception ? String(exception.code) : '-'
    const request = http.getRequest<Request>()
    // Só método e rota (padrão, sem query nem parâmetros): a URL real pode carregar dado pessoal.
    this.logger.error(`Unhandled ${name} (code ${pgCode}) on ${request.method} ${request.route?.path ?? '-'}`)
    response.status(500).json({ code: 'internal' })
  }

  private logSecurityEvent(request: Request & { user?: AuthUser }, status: number, code: string): void {
    const event = SECURITY_EVENT_BY_STATUS[status]
    if (event === undefined) return
    const line = securityLogLine(
      {
        event,
        outcome: 'failure',
        method: request.method,
        // Rota-padrão (`/v1/redemptions/:id`), nunca a URL real: ela pode carregar dado pessoal.
        route: request.route?.path ?? '-',
        code,
        userId: request.user?.id,
        requestId: request.header('x-vercel-id'),
      },
      new Date(),
    )
    this.securityLogger.warn(line)
  }
}
