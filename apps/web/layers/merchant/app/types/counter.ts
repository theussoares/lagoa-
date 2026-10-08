import type { MaskedPhone } from '#shared/schemas/phone'
import type { StampCardBody } from '#layers/ui/app/types/wallet'
import type { ProgramUnit } from '#shared/schemas/program'
import type { CounterEntry } from '#shared/schemas/visit'
import type { DomainErrorCode, TransportError } from '#shared/types/errors'
import type { ComputedRef, Ref } from 'vue'
import type { AsyncResultState } from '#layers/core/app/types/asyncResult'
import type { RedemptionPreview } from '#shared/schemas/redemption'
import type { FocusRequest } from '#layers/ui/app/types/focus'
import type { CounterVisitQrView } from './visitQr'

/** Modelos de exibição do Balcão. Texto pronto em pt-BR; celular só mascarado. */

export interface CounterLedgerEntryModel {
  readonly id: string
  /** "14:32" */
  readonly time: string
  /** `(67) 9••••-0374` — nunca o número completo. */
  readonly phone: MaskedPhone
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

/** O cartão do cliente logo depois do uso do QR da visita, para o atendente conferir de relance. */
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

/** O que o botão principal do Balcão faz, conforme o modo do clube. */
export type CounterAction =
  | { readonly kind: 'visit'; readonly unit: ProgramUnit; readonly units: number }
  | { readonly kind: 'amount'; readonly pointsPerReal: number }

export interface CounterLedger {
  state: ComputedRef<AsyncResultState<CounterEntry[], TransportError>>
  /** Linhas lançadas nesta tela: entram com a batida do carimbo. */
  freshIds: Readonly<Ref<ReadonlySet<string>>>
  reload: () => Promise<void>
  prepend: (entry: CounterEntry) => void
}

export type RedemptionCheckState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'error'; code: DomainErrorCode }
  | { status: 'preview'; preview: RedemptionPreview }
  | { status: 'confirming'; preview: RedemptionPreview }
  | { status: 'delivered'; rewardTitle: string }

export interface RedemptionCheck {
  code: Ref<string[]>
  state: Readonly<Ref<RedemptionCheckState>>
  validate: () => Promise<void>
  /** Entrega o prêmio. Devolve a linha da caderneta, ou null. */
  confirm: () => Promise<CounterEntry | null>
  reset: () => void
}

export type CounterFocusTarget = 'amount' | 'issueVisitQr' | 'redemptionCode'
export type CounterFocus = (target: CounterFocusTarget) => void

export interface CounterRedemptionPreviewModel {
  readonly rewardTitle: string
  /** "(67) 9••••-0374 · vale até 14:32": só o celular mascarado do canhoto. */
  readonly customerLine: string
  readonly confirming: boolean
}

export interface CounterRedemptionView {
  code: string[]
  readonly status: RedemptionCheckState['status']
  readonly errorCode: DomainErrorCode | null
  readonly preview: CounterRedemptionPreviewModel | null
  readonly deliveredReward: string | null
  readonly complete: () => Promise<void>
  readonly deliver: () => Promise<void>
  readonly cancel: () => void
}

export interface CounterLedgerView {
  readonly status: 'loading' | 'error' | 'success'
  readonly errorCode: TransportError['code'] | null
  readonly rows: readonly CounterLedgerEntryModel[]
  readonly reload: () => Promise<void>
}

export interface CounterScreen {
  readonly today: string
  readonly focusRequest: FocusRequest<CounterFocusTarget> | null
  readonly visitQr: CounterVisitQrView
  readonly redemption: CounterRedemptionView
  readonly ledger: CounterLedgerView
}
