import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, Logger } from '@nestjs/common'
import type { Request, Response } from 'express'

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

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp()
    const response = http.getResponse<Response>()
    if (exception instanceof HttpException) {
      const body = exception.getResponse()
      const status = exception.getStatus()
      response.status(status).json(hasCode(body) ? body : { code: CODE_BY_STATUS[status] ?? 'requestFailed' })
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
}
