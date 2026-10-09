import type { ComputedRef, Ref } from 'vue'
import type { FocusRequest } from '#layers/ui/app/types/focus'
import type { QrPath } from '#layers/ui/app/types/qr'
import type { StampCardBody } from '#layers/ui/app/types/wallet'

export type CounterDemoMode = 'stamp' | 'value'

export type CounterDemoStage = 'idle' | 'issued' | 'scanned'

export type CounterDemoFocusTarget = 'amount' | 'generate' | 'simulate' | 'restart'

export interface CounterDemoReceiptModel {
  readonly tone: 'ink' | 'reward'
  readonly tilt: number
  readonly title: string
  readonly detail: string
  readonly body: StampCardBody
}

export interface CounterDemo {
  readonly mode: Ref<CounterDemoMode>
  readonly amount: Ref<string>
  readonly stage: Ref<CounterDemoStage>
  readonly showError: Ref<boolean>
  readonly qr: QrPath
  readonly code: string
  readonly receipt: ComputedRef<CounterDemoReceiptModel | null>
  readonly focusRequest: Readonly<Ref<FocusRequest<CounterDemoFocusTarget> | null>>
  generate: () => void
  simulate: () => void
  restart: () => void
}
