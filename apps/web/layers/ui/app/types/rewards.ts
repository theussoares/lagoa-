import type { ProgressModel } from './progress'

/** Modelos da aba Prêmios. Texto já traduzido pela superfície. */

export interface ReadyRewardModel {
  readonly id: string
  /** Tela do código de resgate deste cartão. */
  readonly to: string
  readonly shopName: string
  readonly icon: string
  readonly reward: string
  /** "Guardado para você até 28 de out." */
  readonly note: string | null
  readonly tilt: number
}

export interface UpcomingRewardModel {
  readonly id: string
  readonly shopName: string
  readonly icon: string
  readonly reward: string
  /** "2" */
  readonly count: string
  /** "faltam" */
  readonly countLabel: string
  /** "8 de 10 carimbos" */
  readonly progressLabel: string
  readonly progress: ProgressModel
  readonly tilt: number
  /** A linha inteira para leitor de tela. */
  readonly summary: string
}
