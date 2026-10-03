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
  /** Cadastro com celular de outra conta: o celular é único por cliente. */
  | { readonly code: 'phoneAlreadyUsed' }
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
  | { readonly code: 'invalidCampaign' }
  /** Ninguém sumido, com avisos aceitos, que ainda não tenha recebido lembrete. */
  | { readonly code: 'noReachableCustomers' }
  /** O alcance mudou entre a confirmação do lojista e o envio; nada foi enviado. */
  | { readonly code: 'reachChanged' }
  | { readonly code: 'invalidClubSetup' }
  /** Ticket do Criar o clube vencido, já usado ou de outro celular: confirmar o celular de novo. */
  | { readonly code: 'signUpExpired' }
  /** Loja aguardando aprovação da rede: Balcão e check-in ainda não valem. */
  | { readonly code: 'shopPendingApproval' }
  /** Loja suspensa pela rede: o painel não lança, não resgata nem envia campanha. */
  | { readonly code: 'shopSuspended' }
  /** Aniversário trocado há menos de `BIRTHDAY_CHANGE_COOLDOWN_DAYS`: a data nova só a partir de `changeableAt`. */
  | { readonly code: 'birthdayLocked'; readonly changeableAt: IsoDateTime }

export type DomainErrorCode = DomainError['code']

export type ErrorOf<C extends DomainErrorCode> = Extract<DomainError, { readonly code: C }>

/** Erros que qualquer chamada remota pode devolver. */
export type TransportError = ErrorOf<'unauthorized' | 'network'>
