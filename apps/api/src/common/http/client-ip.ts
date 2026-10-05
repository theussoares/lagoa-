import { createHash, timingSafeEqual } from 'node:crypto'
import { isIP } from 'node:net'
import type { NextFunction, Request, Response } from 'express'

export const BFF_SECRET_HEADER = 'x-bff-secret'
export const BFF_CLIENT_IP_HEADER = 'x-client-ip'

/** IPs que o BFF autenticado informou, por requisição. Fora dele não há entrada e vale `request.ip`. */
const vouchedIps = new WeakMap<object, string>()

const digest = (value: string): Buffer => createHash('sha256').update(value).digest()

export interface BffClaim {
  /** Segredo configurado na API; `undefined` desliga a confiança no BFF. */
  readonly secret: string | undefined
  readonly presentedSecret: string | undefined
  readonly claimedIp: string | undefined
}

/**
 * Atrás do BFF todo mundo chega com o IP do servidor do Nuxt. O BFF diz quem é o cliente, e a API só acredita
 * se ele provar que é o BFF (segredo compartilhado, comparado em tempo constante). IP malformado é ignorado.
 */
export function trustedClientIp({ secret, presentedSecret, claimedIp }: BffClaim): string | null {
  if (secret === undefined || presentedSecret === undefined || claimedIp === undefined) return null
  if (!timingSafeEqual(digest(secret), digest(presentedSecret))) return null
  return isIP(claimedIp) === 0 ? null : claimedIp
}

export function rememberClientIp(request: object, ip: string): void {
  vouchedIps.set(request, ip)
}

function headerOf(request: Request, name: string): string | undefined {
  const value = request.headers[name]
  return typeof value === 'string' ? value : undefined
}

export function bffClientIpMiddleware(secret: string | undefined) {
  return (request: Request, _response: Response, next: NextFunction): void => {
    const ip = trustedClientIp({ secret, presentedSecret: headerOf(request, BFF_SECRET_HEADER), claimedIp: headerOf(request, BFF_CLIENT_IP_HEADER) })
    if (ip !== null) rememberClientIp(request, ip)
    next()
  }
}

/** Único lugar que decide "de quem é esta requisição" para limite de uso. */
export function clientIpOf(request: { readonly ip?: string }): string {
  return vouchedIps.get(request) ?? request.ip ?? 'unknown'
}
