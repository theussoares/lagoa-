export interface RankingWindow {
  readonly start: Date
  readonly end: Date
}

export interface RankedRow {
  readonly userId: string
  readonly position: number
  readonly name: string
  readonly visits: number
}

export interface RankingMembership {
  readonly optedIn: boolean
  readonly name: string | null
}

export abstract class RankingRepository {
  /** Os `top` primeiros do mês entre quem entrou, mais a linha de `userId` se ele estiver fora do topo. */
  abstract topAndMe(userId: string, window: RankingWindow, top: number): Promise<RankedRow[]>
  abstract visitsOf(userId: string, window: RankingWindow): Promise<number>
  abstract membership(userId: string): Promise<RankingMembership | null>
  /** `false` quando a pessoa não tem perfil. Sair apaga o apelido. */
  abstract setMembership(userId: string, membership: RankingMembership): Promise<boolean>
}
