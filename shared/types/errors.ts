import type { IsoDateTime } from '../schemas/common'

export type DomainEntity = 'shop' | 'program' | 'customer' | 'merchant' | 'card' | 'redemption'

/**
 * Erros esperados de regra de negócio. A UI traduz `code` para a chave
 * `errors.<code>` do pt-BR.json; nenhum erro carrega dado pessoal.
 */
export type DomainError =
  | { readonly code: 'unauthorized' }
  | { readonly code: 'network' }
  | { readonly code: 'notFound'; readonly entity: DomainEntity }
  | { readonly code: 'invalidPhone' }
  | { readonly code: 'invalidLoginCode' }
  | { readonly code: 'loginCodeExpired' }
  | { readonly code: 'invalidAmount' }
  | { readonly code: 'amountNotAccepted' }
  | { readonly code: 'invalidShopQr' }
  | { readonly code: 'checkInDisabled' }
  | { readonly code: 'checkInCooldown'; readonly availableAt: IsoDateTime }
  | { readonly code: 'rewardNotReady'; readonly remaining: number }
  | { readonly code: 'redemptionInvalid' }
  | { readonly code: 'redemptionExpired' }
  | { readonly code: 'redemptionAlreadyUsed' }
  | { readonly code: 'invalidProgram' }
  /** Trocar carimbos ↔ pontos com cartões em andamento exige migração; fora do MVP. */
  | { readonly code: 'programModeLocked' }

export type DomainErrorCode = DomainError['code']

export type ErrorOf<C extends DomainErrorCode> = Extract<DomainError, { readonly code: C }>

/** Erros que qualquer chamada remota pode devolver. */
export type TransportError = ErrorOf<'unauthorized' | 'network'>
