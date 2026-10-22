import { Injectable } from '@nestjs/common'
import { ADMIN_FEATURED_LIST_LIMIT } from '#shared/constants/domain'
import type { AdminFeaturedList, AdminPlacement, FeaturedAvailability, FeaturedPlacementDraft, FeaturedRangeQuery } from '#shared/schemas/featured'
import { ok, type Result } from '#shared/types/result'
import { localMidnight } from '#shared/utils/time'
import { availabilityByDay, planPlacement } from '../../featured/featured.rules'
import type { AdminContext } from '../access/admin.context'
import {
  type AdminPlacementRecord,
  AdminFeaturedRepository,
  type CancelPlacementError,
  type CreatePlacementError,
  type PlacementWindow,
} from './featured.repository'

const windowOf = (query: FeaturedRangeQuery): PlacementWindow => ({ surface: query.surface, from: localMidnight(query.from), to: localMidnight(query.to) })

const toPlacement = (record: AdminPlacementRecord): AdminPlacement => ({
  id: record.id,
  surface: record.surface,
  shop: record.shop,
  hitItem: record.hitItem,
  startsAt: record.startsAt.toISOString(),
  endsAt: record.endsAt.toISOString(),
  note: record.note,
  createdBy: { name: record.createdByName },
  createdAt: record.createdAt.toISOString(),
  cancelledAt: record.cancelledAt === null ? null : record.cancelledAt.toISOString(),
  cancelledBy: record.cancelledByName === null ? null : { name: record.cancelledByName },
})

/** Destaques pagos: agenda de vagas, lançar (com a vaga conferida sob lock) e cancelar. */
@Injectable()
export class AdminFeaturedService {
  constructor(private readonly placements: AdminFeaturedRepository) {}

  async list(query: FeaturedRangeQuery): Promise<AdminFeaturedList> {
    const [placements, proShops] = await Promise.all([
      this.placements.list(windowOf(query), ADMIN_FEATURED_LIST_LIMIT),
      this.placements.listProShops(ADMIN_FEATURED_LIST_LIMIT),
    ])
    return { placements: placements.map(toPlacement), proShops: [...proShops] }
  }

  async availability(query: FeaturedRangeQuery): Promise<FeaturedAvailability> {
    const periods = await this.placements.activePeriods(windowOf(query))
    return { days: availabilityByDay(periods, query.surface, query.from, query.to) }
  }

  async create(admin: AdminContext, draft: FeaturedPlacementDraft): Promise<Result<AdminPlacement, CreatePlacementError>> {
    const candidate = {
      shopId: draft.shopId,
      surface: draft.surface,
      hitItemId: draft.hitItemId,
      startsAt: new Date(draft.startsAt),
      endsAt: new Date(draft.endsAt),
      note: draft.note,
    }
    const saved = await this.placements.create(candidate, admin.adminId, (snapshot) =>
      planPlacement({ ...snapshot, candidate, surface: candidate.surface, shopId: candidate.shopId }),
    )
    return saved.ok ? ok(toPlacement(saved.value)) : saved
  }

  async cancel(admin: AdminContext, id: string): Promise<Result<AdminPlacement, CancelPlacementError>> {
    const cancelled = await this.placements.cancel(id, admin.adminId)
    return cancelled.ok ? ok(toPlacement(cancelled.value)) : cancelled
  }
}
