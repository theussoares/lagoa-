import type { ClubSetupDraft } from '#shared/schemas/onboarding'
import type { MerchantSession, SignUpTicket } from '#shared/schemas/session'
import type { ShopPoster, ShopStatus } from '#shared/schemas/shop'
import type { ErrorOf, TransportError } from '#shared/types/errors'
import type { Result } from '#shared/types/result'

export type CreateClubError = ErrorOf<'signUpExpired' | 'invalidClubSetup'> | TransportError

/** Criar o clube: roda antes de existir sessão, só com o ticket do celular confirmado. */
export interface ClubSetupService {
  createClub(ticket: SignUpTicket, draft: ClubSetupDraft): Promise<Result<MerchantSession, CreateClubError>>
}

export interface ShopPosterService {
  /** Cartaz do balcão com o código de check-in da loja da sessão. */
  getPoster(): Promise<Result<ShopPoster, ErrorOf<'notFound'> | TransportError>>
}

export interface ShopStatusService {
  /** Situação da loja da sessão (aguardando, aprovada, suspensa), lida do servidor. */
  getStatus(): Promise<Result<ShopStatus, TransportError>>
}

/**
 * Atalho de teste: faz o papel do admin da rede e aprova a loja da sessão.
 * Só existe no mock; a aprovação real vem da tela do admin.
 */
export interface ShopApprovalTestingService {
  approveCurrentShop(): Promise<Result<ShopStatus, TransportError>>
}
