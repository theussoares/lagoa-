import type { IsoDateTime } from '../schemas/common'

export type DomainEntity = 'shop' | 'program' | 'customer' | 'merchant' | 'card' | 'redemption' | 'visitQr'

/**
 * Erros esperados de regra de negócio. A UI traduz `code` para a chave
 * `errors.<code>` do pt-BR.json; nenhum erro carrega dado pessoal.
 */
export type DomainError =
  | { readonly code: 'unauthorized' }
  | { readonly code: 'network' }
  /** Limite de requisições (HTTP 429 sem regra de negócio): esperar e tentar de novo. */
  | { readonly code: 'rateLimited' }
  /** Falha do servidor sem detalhe (HTTP 5xx ou resposta fora do contrato). */
  | { readonly code: 'internal' }
  | { readonly code: 'notFound'; readonly entity: DomainEntity }
  | { readonly code: 'invalidPhone' }
  /** Cadastro com celular de outra conta: o celular é único por cliente. */
  | { readonly code: 'phoneAlreadyUsed' }
  /** E-mail já ligado a outra conta (ex.: conta de login recriada): precisa de atendimento, não de nova tentativa. */
  | { readonly code: 'emailAlreadyUsed' }
  | { readonly code: 'invalidLoginCode' }
  | { readonly code: 'loginCodeExpired' }
  | { readonly code: 'invalidAmount' }
  | { readonly code: 'amountNotAccepted' }
  | { readonly code: 'invalidShopQr' }
  /** A loja não aceita entrar no clube pelo cartaz (`programs.check_in_enabled`, P-09); nunca barra o ganho. */
  | { readonly code: 'checkInDisabled' }
  /** QR da visita inexistente, cancelado pelo lojista, de outra loja ou de loja não aprovada. */
  | { readonly code: 'invalidVisitQr' }
  | { readonly code: 'visitQrExpired' }
  | { readonly code: 'visitQrAlreadyUsed' }
  /** Programa da loja mudou desde a emissão (ou o cartão é de uma versão que não aceita esse QR, P-04). */
  | { readonly code: 'visitQrStale' }
  /** QR do cartaz enviado à rota de ganho: ele só coloca no clube. */
  | { readonly code: 'shopQrJoinOnly' }
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
  /** O servidor só grava visita, resgate e convite de quem aceitou a versão atual dos termos (LGPD). */
  | { readonly code: 'termsNotAccepted' }
  /** Aniversário trocado há menos de `BIRTHDAY_CHANGE_COOLDOWN_DAYS`: a data nova só a partir de `changeableAt`. */
  | { readonly code: 'birthdayLocked'; readonly changeableAt: IsoDateTime }

export type DomainErrorCode = DomainError['code']

export type ErrorOf<C extends DomainErrorCode> = Extract<DomainError, { readonly code: C }>

/** Erros que qualquer chamada remota pode devolver. */
export type TransportError = ErrorOf<'unauthorized' | 'network' | 'rateLimited' | 'internal'>
