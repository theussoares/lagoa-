import { describe, expect, it } from 'vitest'
import type { Ranking } from '#shared/schemas/ranking'
import { monthTitle, myStandingLine, toRankingRows } from '#layers/customer/app/utils/rankingModel'

const t = (key: string, named: Record<string, unknown> = {}): string => `${key}:${JSON.stringify(named)}`

const ranking = (me: Ranking['me'], entries: Ranking['entries'] = []): Ranking => ({ month: '2026-10', entries, me })

describe('ranking model', () => {
  it('turns entries into rows with a pluralised visit label', () => {
    const rows = toRankingRows(ranking({ optedIn: true, position: 1, visits: 3, name: 'Ana' }, [{ position: 1, name: 'Ana', visits: 3, isMe: true }]), t)
    expect(rows).toEqual([{ position: 1, name: 'Ana', visitsLabel: 'ranking.visits:{"count":3}', isMe: true }])
  })

  it('only adds a standing line for someone who joined and is outside the list', () => {
    expect(myStandingLine(ranking({ optedIn: false, position: null, visits: 0, name: null }), t)).toBeNull()
    expect(myStandingLine(ranking({ optedIn: true, position: null, visits: 0, name: 'Ana' }), t)).toBe('ranking.noVisitsYet:{}')
    expect(myStandingLine(ranking({ optedIn: true, position: 14, visits: 2, name: 'Ana' }), t)).toBe('ranking.myPosition:{"position":14,"visits":2}')
    expect(myStandingLine(ranking({ optedIn: true, position: 1, visits: 2, name: 'Ana' }, [{ position: 1, name: 'Ana', visits: 2, isMe: true }]), t)).toBeNull()
  })

  it('writes the month in pt-BR', () => {
    expect(monthTitle('2026-10')).toBe('outubro de 2026')
  })
})
