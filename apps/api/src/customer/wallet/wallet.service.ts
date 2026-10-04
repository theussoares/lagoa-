import { Inject, Injectable, Logger } from '@nestjs/common'
import { sortByRewardProximity } from '#shared/domain/loyaltyCard'
import type { WalletCard } from '#shared/schemas/loyaltyCard'
import type { WalletActivity } from '#shared/schemas/visit'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import { Clock } from '../../common/clock'
import { ENV } from '../../config/config.module'
import type { Env } from '../../config/env'
import { toWalletActivity, toWalletCard } from './wallet.mapper'
import { ACTIVITY_KINDS, type ActivityKind, WalletRepository } from './wallet.repository'

/** Bônus de boas-vindas e indicação não são linha da caderneta: aparecem como carimbos no cartão. */
const REWARD_KINDS: readonly ActivityKind[] = ['redemption']

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name)

  constructor(
    private readonly repository: WalletRepository,
    @Inject(ENV) private readonly env: Pick<Env, 'SUPABASE_URL'>,
    private readonly clock: Clock,
  ) {}

  /** Já ordenados por proximidade do prêmio. */
  async listCards(customerId: string): Promise<Result<WalletCard[], never>> {
    const records = await this.repository.listCards(customerId)
    const now = this.clock.now()
    const cards = records.flatMap((record) => {
      const card = toWalletCard(record, this.env.SUPABASE_URL, now)
      if (card.ok) return [card.value]
      this.logger.warn(`Card ${record.cardId} skipped: breaks the contract`)
      return []
    })
    return ok(sortByRewardProximity(cards))
  }

  async getCard(customerId: string, shopId: string): Promise<Result<WalletCard, ErrorOf<'notFound'>>> {
    const record = await this.repository.findCard(customerId, shopId)
    const card = record === null ? null : toWalletCard(record, this.env.SUPABASE_URL, this.clock.now())
    return card?.ok ? ok(card.value) : err({ code: 'notFound', entity: 'card' })
  }

  listActivity(customerId: string, limit: number): Promise<Result<WalletActivity[], never>> {
    return this.activity(customerId, ACTIVITY_KINDS, limit)
  }

  /** Só os resgates entregues no balcão. */
  listRewardHistory(customerId: string, limit: number): Promise<Result<WalletActivity[], never>> {
    return this.activity(customerId, REWARD_KINDS, limit)
  }

  private async activity(customerId: string, kinds: readonly ActivityKind[], limit: number): Promise<Result<WalletActivity[], never>> {
    const records = await this.repository.listActivity(customerId, kinds, limit)
    return ok(
      records.flatMap((record) => {
        const activity = toWalletActivity(record)
        if (activity.ok) return [activity.value]
        this.logger.warn(`Ledger entry ${record.id} skipped: breaks the contract`)
        return []
      }),
    )
  }
}
