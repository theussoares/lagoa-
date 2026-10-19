import type { Request } from 'express'
import type { PhoneNumber } from '#shared/schemas/phone'

/** Papel gravado pela rede em `app_metadata.role` (só o service_role escreve ali). Quem não tem papel é cliente ou lojista. */
export type AuthRole = 'admin'

/** Nível de garantia da sessão do Supabase: `aal2` = passou pelo segundo fator (MFA). */
export type AuthAssuranceLevel = 'aal1' | 'aal2'

export interface AuthUser {
  readonly id: string
  readonly email: string | undefined
  /** Celular confirmado por SMS (claim `phone` do JWT); `undefined` em quem entrou por e-mail. */
  readonly phone: PhoneNumber | undefined
  /** `admin` só com `app_metadata.role === 'admin'`; qualquer outro valor (ou nenhum) é `null`. */
  readonly role: AuthRole | null
  /** Claim `aal` do token; ausente ou desconhecido é `null`. */
  readonly aal: AuthAssuranceLevel | null
}

export type AuthenticatedRequest = Request & { user: AuthUser }
