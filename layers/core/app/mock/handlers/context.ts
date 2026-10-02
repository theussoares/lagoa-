import type { Clock, IdGenerator, RandomSource } from '../runtime'
import type { MockState } from '../state'

/** Uma "requisição" ao servidor falso: estado carregado, relógio congelado no instante da chamada. */
export interface MockContext {
  readonly state: MockState
  readonly now: Date
  readonly ids: IdGenerator
  readonly random: RandomSource
}

export interface MockRuntime {
  readonly clock: Clock
  readonly ids: IdGenerator
  readonly random: RandomSource
}
