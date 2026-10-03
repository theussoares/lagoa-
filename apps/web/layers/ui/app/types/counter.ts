import type { StampCardBody } from './wallet'

/** Modelos de exibição do Balcão. Texto pronto em pt-BR; celular só mascarado. */

export interface CounterLedgerEntryModel {
  readonly id: string
  /** "14:32" */
  readonly time: string
  /** `(67) 9••••-0374` — nunca o número completo. */
  readonly phone: string
  /** "Cliente novo" quando o cartão nasceu neste lançamento. */
  readonly badge: string | null
  /** "+1 carimbo", "+24 pontos · R$ 24,00", "Prêmio entregue: Corte grátis". */
  readonly action: string
  readonly tone: 'ink' | 'reward'
  readonly icon: string
  readonly tilt: number
  /** Lançada agora, nesta tela: entra com a batida do carimbo. */
  readonly fresh: boolean
}

export interface CounterKeypadLabels {
  readonly clear: string
  readonly backspace: string
}

/** O cartão do cliente logo depois do lançamento, para o atendente conferir de relance. */
export interface LaunchReceiptModel {
  readonly tone: 'ink' | 'reward'
  /** Inclinação fixa da impressão grande do recibo. */
  readonly tilt: number
  /** "+1 carimbo para (67) 9••••-0374" */
  readonly title: string
  /** "Agora tem 7 de 10. Faltam 3 para Corte grátis." */
  readonly detail: string
  readonly body: StampCardBody
}
