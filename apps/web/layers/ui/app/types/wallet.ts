/**
 * Modelos de exibição dos componentes de domínio. Chegam com o texto pronto
 * (pt-BR já traduzido pela superfície); os componentes só desenham.
 */

export interface StampSlotModel {
  readonly number: number
  readonly stamped: boolean
  /** Última casa do cartão: vazia mostra o presente no lugar do número. */
  readonly isRewardSlot: boolean
  /** Inclinação fixa da impressão, entre −6° e +6°. */
  readonly tilt: number
  /** Chegou desde a última vez que a pessoa viu o cartão: recebe a batida. */
  readonly fresh: boolean
  readonly delayMs: number
}

export type StampCardBody =
  | { readonly kind: 'slots'; readonly slots: readonly StampSlotModel[] }
  | { readonly kind: 'ruler'; readonly balance: number; readonly target: number; readonly label: string }

export type StampCardStatus =
  | {
      readonly kind: 'remaining'
      /** "2" no tamanho de contagem. */
      readonly count: string
      /** "carimbos para" */
      readonly unitLine: string
      readonly reward: string
    }
  | {
      readonly kind: 'ready'
      /** Texto da impressão vermelha: "Prêmio liberado". */
      readonly seal: string
      readonly reward: string
      /** "Guardado até 31 de out." */
      readonly note: string | null
      /** Liberou desde a última visita: a impressão vermelha cai com a batida. */
      readonly fresh: boolean
    }

export interface StampCardModel {
  readonly id: string
  readonly shopName: string
  readonly shopDetail: string
  readonly icon: string
  /** "08/10" ou "96/150". */
  readonly progress: string
  readonly body: StampCardBody
  readonly status: StampCardStatus
  /** Frase curta para a borda do cartão no maço: "Faltam 2 carimbos". */
  readonly peek: string
  /** A frase inteira para leitor de tela. */
  readonly summary: string
  readonly rewardReady: boolean
}

export interface LedgerEntryModel {
  readonly id: string
  /** "setembro": agrupa a caderneta por mês. */
  readonly month: string
  readonly when: string
  readonly title: string
  readonly detail: string
  readonly delta: string
  readonly tone: 'ink' | 'reward'
  /** Carimbo da loja que acompanha a linha. */
  readonly icon: string
  readonly tilt: number
}

export interface TabBarItem {
  readonly to: string
  readonly label: string
  readonly icon: string
  readonly activeIcon: string
}
