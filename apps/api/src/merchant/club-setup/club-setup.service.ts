import { Injectable } from '@nestjs/common'
import { MERCHANT_TERMS_VERSION } from '#shared/constants/domain'
import { MerchantIdSchema, ShopIdSchema } from '#shared/schemas/ids'
import type { ClubSetupDraft } from '#shared/schemas/onboarding'
import type { MerchantSession } from '#shared/schemas/session'
import { CheckInCodeSchema, type ShopPoster, type ShopStatus } from '#shared/schemas/shop'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import type { AuthUser } from '../../auth/auth.types'
import { Clock } from '../../common/clock'
import { PiiService } from '../../common/pii.service'
import { ClubSetupRepository } from './club-setup.repository'
import { newCheckInCode } from './club-setup.rules'

export type CreateClubError = ErrorOf<'unauthorized' | 'phoneAlreadyUsed'>

export interface ClubCreation {
  readonly session: MerchantSession
  /** `false` quando o dono já tinha loja: devolve a existente, sem aplicar o rascunho (idempotente). */
  readonly created: boolean
}

@Injectable()
export class ClubSetupService {
  constructor(
    private readonly repo: ClubSetupRepository,
    private readonly pii: PiiService,
    private readonly clock: Clock,
  ) {}

  /**
   * O celular vem do token (confirmado por SMS), nunca do corpo. Repetir a chamada, ou duas abas ao mesmo tempo,
   * não cria uma segunda loja: a segunda recebe a primeira.
   */
  async createClub(user: AuthUser, draft: ClubSetupDraft): Promise<Result<ClubCreation, CreateClubError>> {
    if (user.phone === undefined) return err({ code: 'unauthorized' })
    const outcome = await this.repo.createClub(
      {
        userId: user.id,
        phoneEncrypted: this.pii.encrypt(user.phone),
        phoneHash: this.pii.hashPhone(user.phone),
        // O painel não usa e-mail, e o do token não é verificado contra o cadastro de ninguém: gravá-lo só faria o
        // Criar o clube falhar (e-mail único) quando um cliente tivesse informado o mesmo endereço.
        emailEncrypted: null,
        emailHash: null,
      },
      draft,
      newCheckInCode,
      this.clock.now(),
    )
    if (outcome.kind === 'phoneTaken') return err({ code: 'phoneAlreadyUsed' })
    if (outcome.kind === 'accountErased') return err({ code: 'unauthorized' })
    const { club } = outcome
    return ok({
      created: outcome.kind === 'created',
      session: {
        role: 'merchant',
        merchantId: MerchantIdSchema.parse(user.id),
        shopId: ShopIdSchema.parse(club.shopId),
        shopName: club.shopName,
        shopStatus: club.shopStatus,
        termsAccepted: club.merchantTermsVersion === MERCHANT_TERMS_VERSION,
      },
    })
  }

  async isPosterReprintPending(ownerUserId: string): Promise<Result<boolean, ErrorOf<'notFound'>>> {
    const pending = await this.repo.isPosterReprintPending(ownerUserId)
    return pending === null ? err({ code: 'notFound', entity: 'shop' }) : ok(pending)
  }

  async markPosterReprinted(ownerUserId: string): Promise<Result<boolean, ErrorOf<'notFound'>>> {
    const pending = await this.repo.markPosterReprinted(ownerUserId, this.clock.now())
    return pending === null ? err({ code: 'notFound', entity: 'shop' }) : ok(pending)
  }

  async getPoster(ownerUserId: string): Promise<Result<ShopPoster, ErrorOf<'notFound'>>> {
    const data = await this.repo.getPoster(ownerUserId)
    if (data === null) return err({ code: 'notFound', entity: 'program' })
    return ok({
      shopName: data.shopName,
      status: data.status,
      checkInCode: CheckInCodeSchema.parse(data.checkInCode),
      rewardTitle: data.rewardTitle,
      unit: data.unit,
      target: data.target,
    })
  }

  async getStatus(ownerUserId: string): Promise<Result<ShopStatus, ErrorOf<'notFound'>>> {
    const status = await this.repo.getStatus(ownerUserId)
    if (status === null) return err({ code: 'notFound', entity: 'merchant' })
    return ok(status)
  }

  async testApprove(ownerUserId: string): Promise<Result<ShopStatus, ErrorOf<'notFound' | 'unauthorized'>>> {
    if (process.env.ENABLE_TEST_APPROVE !== '1') {
      return err({ code: 'unauthorized' })
    }
    const status = await this.repo.approveShop(ownerUserId)
    if (status === null) return err({ code: 'notFound', entity: 'merchant' })
    return ok(status)
  }
}
