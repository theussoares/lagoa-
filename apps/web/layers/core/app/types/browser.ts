import type { RouteLocationNormalized } from 'vue-router'

export type VibrationPattern = number | readonly number[]

export interface LeaveGuardOptions {
  /** Há algo a perder agora? */
  readonly when: () => boolean
  /** Sai sem perguntar (por exemplo, rumo ao login). */
  readonly allow?: (to: RouteLocationNormalized) => boolean
  /** Texto pt-BR já traduzido. */
  readonly message: () => string
  /** Também avisa ao fechar ou recarregar a aba. */
  readonly warnOnUnload: boolean
}
