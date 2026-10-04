import { Injectable } from '@nestjs/common'
import { RANKING_TOP_SIZE } from '#shared/constants/domain'
import { type Ranking, RankingSchema, type RankingConsentUpdate } from '#shared/schemas/ranking'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import { localMonthBounds } from '#shared/utils/time'
import { Clock } from '../../common/clock'
import { RankingRepository } from './ranking.repository'

@Injectable()
export class RankingService {
  constructor(
    private readonly repository: RankingRepository,
    private readonly clock: Clock,
  ) {}

  async get(userId: string): Promise<Result<Ranking, ErrorOf<'notFound'>>> {
    const membership = await this.repository.membership(userId)
    if (membership === null) return err({ code: 'notFound', entity: 'customer' })
    const { month, start, end } = localMonthBounds(this.clock.now())
    const window = { start, end }
    const [rows, visits] = await Promise.all([this.repository.topAndMe(userId, window, RANKING_TOP_SIZE), this.repository.visitsOf(userId, window)])
    const mine = rows.find((row) => row.userId === userId)
    return ok(
      RankingSchema.parse({
        month,
        entries: rows.filter((row) => row.position <= RANKING_TOP_SIZE).map((row) => ({ position: row.position, name: row.name, visits: row.visits, isMe: row.userId === userId })),
        me: { optedIn: membership.optedIn, position: mine?.position ?? null, visits, name: membership.name },
      }),
    )
  }

  /** Entrar (com apelido) ou sair; devolve o ranking já atualizado. */
  async setConsent(userId: string, update: RankingConsentUpdate): Promise<Result<Ranking, ErrorOf<'notFound'>>> {
    const found = await this.repository.setMembership(userId, update.granted ? { optedIn: true, name: update.name } : { optedIn: false, name: null })
    return found ? this.get(userId) : err({ code: 'notFound', entity: 'customer' })
  }
}
