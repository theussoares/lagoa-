export const TALLY_GROUP = 5
export const TALLY_MAX_MARKS = 30

export interface TallyGroups {
  /** Risquinhos em cada grupo, cada um com no máximo TALLY_GROUP. */
  readonly groups: readonly number[]
  readonly overflow: boolean
}

/** Contagem de caderneta: grupos de 5 até o limite; o resto vira um "+" (o número exato fica escrito ao lado). */
export function tallyGroups(count: number): TallyGroups {
  const marks = Math.min(Math.max(0, Math.floor(count)), TALLY_MAX_MARKS)
  const groups = Array.from({ length: Math.ceil(marks / TALLY_GROUP) }, (_, index) => Math.min(TALLY_GROUP, marks - index * TALLY_GROUP))
  return { groups, overflow: count > TALLY_MAX_MARKS }
}
