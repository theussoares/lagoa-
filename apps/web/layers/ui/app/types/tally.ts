export interface TallyGroups {
  /** Risquinhos em cada grupo, cada um com no máximo TALLY_GROUP. */
  readonly groups: readonly number[]
  readonly overflow: boolean
}
