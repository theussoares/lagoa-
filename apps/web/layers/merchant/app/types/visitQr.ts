import type { QrPath } from '#layers/ui/app/types/qr'
import type { VisitToken, VisitQr, VisitQrStatus } from '#shared/schemas/visitQr'
import type { DomainErrorCode } from '#shared/types/errors'
import type { Ref } from 'vue'
import type { CounterAction, LaunchReceiptModel } from './counter'

/** QR da visita no Balcão. O token só existe aqui, em memória: o servidor guarda só o hash. */
export type VisitQrState =
  | { status: 'idle' }
  | { status: 'issuing' }
  | { status: 'error'; code: DomainErrorCode }
  | { status: 'showing'; qr: VisitQr; token: VisitToken; skewMs: number }

export interface VisitQrControl {
  /** Só dígitos (centavos); só vale no modo pontos por real. */
  amount: Ref<string>
  state: Readonly<Ref<VisitQrState>>
  /** Segundos que faltam para vencer, pelo relógio do servidor; 0 sem QR aguardando o cliente. */
  remaining: Readonly<Ref<number>>
  issue: (action: CounterAction) => Promise<void>
  cancel: () => Promise<void>
  reset: () => void
  /** `null` fora do mock. */
  simulateClaim: (() => Promise<void>) | null
}

/** Botão de gerar e a dica do valor, conforme o modo do clube e o valor digitado. */
export interface VisitQrIssueText {
  readonly issueLabel: string
  readonly amountHint: string | undefined
  /** "R$ 24,00 vale 24 pontos (antes de bônus)."; só no modo por real, com valor. */
  readonly amountPreview: string | undefined
}

export interface VisitQrDisplayModel {
  readonly qr: QrPath
  readonly qrLabel: string
  readonly visitCode: string
  readonly status: VisitQrStatus
  readonly statusLabel: string
  /** "4:12" enquanto aguarda o cliente. */
  readonly countdown: string | null
  /** "Recusado: esse cliente já ganhou aqui. Libera hoje às 18:40." */
  readonly refusal: string | null
  readonly receipt: { readonly key: string; readonly model: LaunchReceiptModel } | null
}

export interface VisitQrDisplayInput {
  readonly qr: VisitQr
  readonly qrCode: QrPath
  readonly remainingSeconds: number
  readonly rewardTitle: string
}

export interface CounterVisitQrView {
  /** "R$ 24,90" ou vazio. */
  readonly amountText: string
  readonly action: CounterAction | null
  readonly issueLabel: string
  readonly amountHint: string | undefined
  readonly amountPreview: string | undefined
  readonly pending: boolean
  readonly amountErrorCode: 'invalidAmount' | null
  /** Erro que não é de campo. */
  readonly alertCode: DomainErrorCode | null
  readonly programFailed: boolean
  /** `null` enquanto não há QR no ar: o painel mostra o formulário. */
  readonly display: VisitQrDisplayModel | null
  readonly canSimulate: boolean
  readonly inputAmount: (value: string | number) => void
  readonly issue: () => Promise<void>
  readonly cancel: () => Promise<void>
  readonly issueAnother: () => Promise<void>
  readonly print: () => void
  readonly simulateClaim: () => Promise<void>
  readonly retryProgram: () => Promise<void>
}
