import type { ClubSetupDraft } from '#shared/schemas/onboarding'
import type { ProgramUnit } from '#shared/schemas/program'
import type { ShopStatus } from '#shared/schemas/shop'
import type { NewAppUser } from '../../accounts/app-user.writer'

export interface CreatedClub {
  readonly shopId: string
  readonly shopName: string
  readonly shopStatus: ShopStatus
}

export type CreateClubOutcome =
  | { readonly kind: 'created' | 'existing'; readonly club: CreatedClub }
  | { readonly kind: 'phoneTaken' }

export interface PosterData {
  readonly shopName: string
  readonly status: ShopStatus
  readonly checkInCode: string
  readonly rewardTitle: string
  readonly unit: ProgramUnit
  readonly target: number
}

export abstract class ClubSetupRepository {
  /**
   * Numa transação: garante o `app_users` do dono, cria a loja e o programa. Quem já tem loja recebe a existente
   * (`existing`) sem aplicar o rascunho. `newCheckInCode` é chamado de novo se o código sorteado colidir.
   */
  abstract createClub(owner: NewAppUser, draft: ClubSetupDraft, newCheckInCode: () => string): Promise<CreateClubOutcome>
  abstract getPoster(ownerUserId: string): Promise<PosterData | null>
  abstract getStatus(ownerUserId: string): Promise<ShopStatus | null>
  abstract approveShop(ownerUserId: string): Promise<ShopStatus | null>
  /** `true` enquanto o cartaz novo não foi impresso; `null` sem loja. */
  abstract isPosterReprintPending(ownerUserId: string): Promise<boolean | null>
  /** Marca como impresso (idempotente) e devolve a situação nova; `null` sem loja. */
  abstract markPosterReprinted(ownerUserId: string, now: Date): Promise<boolean | null>
}
