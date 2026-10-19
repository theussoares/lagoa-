import { Inject, Injectable, Logger } from '@nestjs/common'
import { z } from 'zod'
import { ADMIN_SET_PASSWORD_PATH } from '#shared/constants/domain'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import { ENV } from '../../config/config.module'
import type { Env } from '../../config/env'
import { AdminAuth, type AdminInviteError } from './admin-auth'

const AUTH_TIMEOUT_MS = 10_000
const CreatedUserSchema = z.object({ id: z.uuid() })
const FactorListSchema = z.array(z.object({ id: z.string().min(1), factor_type: z.string() }))
const ErrorBodySchema = z.object({ error_code: z.string().optional() })

const NETWORK: ErrorOf<'network'> = { code: 'network' }

async function errorCodeOf(response: Response): Promise<string | undefined> {
  const body = ErrorBodySchema.safeParse(await response.json().catch(() => null))
  return body.success ? body.data.error_code : undefined
}

/**
 * API admin do Supabase Auth pela REST, com a service role. Fora a foto da loja, é o único lugar que usa essa chave.
 * Não há "encerrar as sessões de um usuário por id" nessa API (`/admin/users/{id}/logout` não existe): quem é
 * desativado perde o acesso pelo `AdminGuard`, que lê `admin_users` a cada pedido.
 */
@Injectable()
export class SupabaseAdminAuth extends AdminAuth {
  private readonly logger = new Logger(SupabaseAdminAuth.name)

  constructor(@Inject(ENV) private readonly env: Pick<Env, 'SUPABASE_URL' | 'SUPABASE_SERVICE_ROLE_KEY' | 'ADMIN_APP_URL'>) {
    super()
  }

  async invite(email: string, name: string): Promise<Result<{ userId: string }, AdminInviteError>> {
    // A conta nasce com o papel (sem `email_confirm`: fica pendente até o convite ser aceito). Assim não há janela em
    // que ela tenha token sem `role: admin`, e o `/admin/users` recusa com `email_exists` qualquer e-mail já usado.
    const created = await this.call('POST', '/admin/users', { email, app_metadata: { role: 'admin' }, user_metadata: { name } })
    if (created === null) return err(NETWORK)
    if (!created.ok) {
      if ((await errorCodeOf(created)) === 'email_exists') return err({ code: 'alreadyExists' })
      this.logger.error(`Admin account creation failed with status ${created.status}`)
      return err(NETWORK)
    }
    const user = CreatedUserSchema.safeParse(await created.json().catch(() => null))
    if (!user.success) {
      this.logger.error('Admin account creation answered out of contract')
      return err(NETWORK)
    }
    // O `/invite` reaproveita a conta pendente que acabamos de criar (e recusa uma já confirmada).
    const invited = await this.call('POST', this.invitePath(), { email })
    if (invited === null || !invited.ok) {
      this.logger.error(`Admin invite e-mail failed (status ${invited?.status ?? 'network'}); removing the new account`)
      await this.cancelInvite(user.data.id)
      return err(NETWORK)
    }
    return ok({ userId: user.data.id })
  }

  /** Com `ADMIN_APP_URL`, o link do e-mail leva à página de definir senha do painel; sem ela (só fora de produção), ao Site URL. */
  private invitePath(): string {
    if (this.env.ADMIN_APP_URL === undefined) return '/invite'
    const target = `${this.env.ADMIN_APP_URL.replace(/\/+$/, '')}${ADMIN_SET_PASSWORD_PATH}`
    return `/invite?redirect_to=${encodeURIComponent(target)}`
  }

  async cancelInvite(userId: string): Promise<void> {
    const response = await this.call('DELETE', `/admin/users/${encodeURIComponent(userId)}`)
    if (response === null || !response.ok) this.logger.error(`Could not remove a half-created admin account (status ${response?.status ?? 'network'})`)
  }

  async deleteMfaFactors(userId: string): Promise<Result<void, ErrorOf<'network'>>> {
    const user = `/admin/users/${encodeURIComponent(userId)}`
    const listed = await this.call('GET', `${user}/factors`)
    const factors = listed !== null && listed.ok ? FactorListSchema.safeParse(await listed.json().catch(() => null)) : null
    if (factors === null || !factors.success) {
      this.logger.error(`Listing MFA factors failed (status ${listed?.status ?? 'network'})`)
      return err(NETWORK)
    }
    for (const factor of factors.data.filter((entry) => entry.factor_type === 'totp')) {
      const deleted = await this.call('DELETE', `${user}/factors/${encodeURIComponent(factor.id)}`)
      // 404 = já não existe (outro reset no meio): o resultado é o mesmo.
      if (deleted === null || (!deleted.ok && deleted.status !== 404)) {
        this.logger.error(`Deleting an MFA factor failed (status ${deleted?.status ?? 'network'})`)
        return err(NETWORK)
      }
    }
    return ok(undefined)
  }

  /** `null` = sem chave configurada ou falha de rede. Nunca loga corpo nem URL com dado da pessoa. */
  private async call(method: 'GET' | 'POST' | 'DELETE', path: string, body?: object): Promise<Response | null> {
    const key = this.env.SUPABASE_SERVICE_ROLE_KEY
    if (key === undefined) {
      this.logger.error('SUPABASE_SERVICE_ROLE_KEY is not set: admin team changes are off')
      return null
    }
    try {
      return await fetch(`${this.env.SUPABASE_URL.replace(/\/+$/, '')}/auth/v1${path}`, {
        method,
        headers: { authorization: `Bearer ${key}`, apikey: key, ...(body !== undefined && { 'content-type': 'application/json' }) },
        ...(body !== undefined && { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
      })
    } catch {
      this.logger.error(`Supabase Auth admin call failed (network) on ${method}`)
      return null
    }
  }
}
