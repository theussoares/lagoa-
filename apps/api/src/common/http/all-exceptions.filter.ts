import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, Logger } from '@nestjs/common'
import type { Response } from 'express'

const CODE_BY_STATUS: Readonly<Record<number, string>> = {
  401: 'unauthorized',
  404: 'routeNotFound',
  429: 'rateLimited',
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
    const response = host.switchToHttp().getResponse<Response>()
    if (exception instanceof HttpException) {
      const body = exception.getResponse()
      const status = exception.getStatus()
      response.status(status).json(hasCode(body) ? body : { code: CODE_BY_STATUS[status] ?? 'requestFailed' })
      return
    }
    const name = exception instanceof Error ? exception.name : typeof exception
    const pgCode = typeof exception === 'object' && exception !== null && 'code' in exception ? String(exception.code) : '-'
    this.logger.error(`Unhandled ${name} (code ${pgCode})`)
    response.status(500).json({ code: 'internal' })
  }
}
