import type { Ranking } from '#shared/schemas/ranking'
import type { Translate } from '#layers/core/app/types/i18n'
import type { RankingRowModel } from '../types/ranking'

export function toRankingRows(ranking: Ranking, t: Translate): RankingRowModel[] {
  return ranking.entries.map((entry) => ({
    position: entry.position,
    name: entry.name,
    visitsLabel: t('ranking.visits', { count: entry.visits }, entry.visits),
    isMe: entry.isMe,
  }))
}

/** Quem entrou e está fora do topo (ou sem visita no mês) ganha uma linha de contexto. */
export function myStandingLine(ranking: Ranking, t: Translate): string | null {
  const { me } = ranking
  if (!me.optedIn) return null
  if (me.position === null) return t('ranking.noVisitsYet')
  return ranking.entries.some((entry) => entry.isMe) ? null : t('ranking.myPosition', { position: me.position, visits: me.visits })
}

/** "outubro de 2026" para o título do mês. */
export function monthTitle(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number)
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year ?? 1970, (monthNumber ?? 1) - 1, 1)))
}
