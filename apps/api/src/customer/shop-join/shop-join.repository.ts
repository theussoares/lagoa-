import type { ExpirationPolicy } from '#shared/schemas/program'
import type { CheckInCode } from '#shared/schemas/shop'
import type { ErrorOf } from '#shared/types/errors'
import type { Result } from '#shared/types/result'

export interface JoinableShop {
  readonly shopId: string
  /** Versão ativa do programa. */
  readonly programId: string
  /** `programs.check_in_enabled`: a loja aceita entrar pelo cartaz (P-09). */
  readonly joinEnabled: boolean
  readonly expiration: ExpirationPolicy
  readonly target: number
}

export abstract class ShopJoinRepository {
  /** Só loja aprovada com programa ativo e janela válida; o resto é indistinguível de código inexistente. */
  abstract findShopByCode(code: CheckInCode): Promise<JoinableShop | null>

  /** Leitura simples (sem lock): quem já é membro sai sem transação e sem escrita (RN-02). */
  abstract findCardId(customerId: string, shopId: string): Promise<string | null>

  /**
   * Cria o cartão zerado na versão ativa via `LedgerStore.lockOrCreateCard`. Sem `credit`, sem ledger de visita,
   * `last_visit_at` nulo (RN-01). Corrida: o segundo a chegar vê `created = false`. `unauthorized` sem perfil.
   */
  abstract join(customerId: string, shop: JoinableShop, now: Date): Promise<Result<{ cardId: string; created: boolean }, ErrorOf<'unauthorized'>>>
}
