import { Injectable } from '@nestjs/common'
import { DATA_EXPORT_LIST_LIMIT } from '#shared/constants/domain'
import { type DataExport, DataExportSchema } from '#shared/schemas/dataExport'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import { toIso } from '#shared/utils/time'
import { Clock } from '../../common/clock'
import { ProfileService } from '../profile/profile.service'
import { DataExportRepository } from './data-export.repository'

@Injectable()
export class DataExportService {
  constructor(
    private readonly repository: DataExportRepository,
    private readonly profiles: ProfileService,
    private readonly clock: Clock,
  ) {}

  async export(customerId: string): Promise<Result<DataExport, ErrorOf<'notFound'>>> {
    const profile = await this.profiles.get(customerId)
    if (!profile.ok) return err(profile.error)
    const [cards, ledger, redemptions, referrals] = await Promise.all([
      this.repository.cards(customerId),
      this.repository.ledger(customerId, DATA_EXPORT_LIST_LIMIT),
      this.repository.redemptions(customerId, DATA_EXPORT_LIST_LIMIT),
      this.repository.referralCounts(customerId),
    ])
    return ok(
      DataExportSchema.parse({
        exportedAt: toIso(this.clock.now()),
        profile: profile.value,
        cards: cards.map((card) => ({ ...card, createdAt: toIso(card.createdAt), lastVisitAt: card.lastVisitAt && toIso(card.lastVisitAt) })),
        ledger: ledger.map((entry) => ({ ...entry, occurredAt: toIso(entry.occurredAt) })),
        redemptions: redemptions.map((item) => ({ ...item, createdAt: toIso(item.createdAt), redeemedAt: item.redeemedAt && toIso(item.redeemedAt) })),
        referrals,
      }),
    )
  }
}
