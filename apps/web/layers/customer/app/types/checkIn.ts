import type { WalletCard } from '#shared/schemas/loyaltyCard'
import type { CheckInResult } from '#shared/schemas/visit'
import type { CheckInError } from '../services/CheckInService'
import type { Ref } from 'vue'
import type { LoyaltyCardId } from '#shared/schemas/ids'
import type { FocusRequest } from '#layers/ui/app/types/focus'
import type { StampCardModel } from '#layers/ui/app/types/wallet'

/** De onde veio o código: muda como o erro é explicado e como a pessoa tenta de novo. */
export type CheckInSource = 'camera' | 'typed' | 'link'

export type CheckInRecovery = 'scanAgain' | 'retry' | 'wallet'

export interface CheckInNoticeModel {
  readonly tone: 'warning' | 'error'
  readonly icon: string
  readonly title: string
  readonly message: string
  readonly recovery: CheckInRecovery
}

/** Que batida foi essa: comum, a penúltima (quase lá) ou a que liberou o prêmio. */
export type CheckInMoment = 'earned' | 'almost' | 'reward'

export interface CheckInEarnedModel {
  readonly moment: CheckInMoment
  readonly title: string
  readonly lead: string
  /** "Falta só 1 carimbo!": só no quase lá. */
  readonly cheer: string | null
  readonly next: string
  /** Frase única para o leitor de tela anunciar o carimbo. */
  readonly announcement: string
}

export type CheckInState =
  | { status: 'idle' }
  | { status: 'submitting'; source: CheckInSource }
  /** `card` é o cartão já atualizado; sem ele (rede caiu no meio) a tela mostra só o resumo. */
  | { status: 'earned'; result: CheckInResult; card: WalletCard | null }
  | { status: 'error'; error: CheckInError; source: CheckInSource }

export interface CheckIn {
  state: Readonly<Ref<CheckInState>>
  /** `raw` é o conteúdo do QR, o texto digitado ou o `?loja=` do link. */
  submit: (raw: string, source: CheckInSource) => Promise<void>
  /** Repete o último código (depois de falha de rede). */
  retry: () => Promise<void>
  reset: () => void
}

export type CheckInFocusTarget = 'earnedHeading' | 'code'
export type CheckInMode = 'scan' | 'type'
export type CameraIssue = 'denied' | 'unavailable'
export type ViewfinderStatus = 'busy' | 'scanning' | 'starting'

export interface CheckInHeroStamp {
  readonly icon: string
  readonly tilt: number
  readonly tone: 'ink' | 'reward'
}

export interface CheckInEarnedView {
  readonly text: CheckInEarnedModel
  readonly card: StampCardModel | null
  readonly heroStamp: CheckInHeroStamp
  /** Cartão do botão "Resgatar": só quando o prêmio liberou. */
  readonly rewardCardId: LoyaltyCardId | null
}

export interface CheckInScreen {
  readonly view: 'earned' | 'notice' | 'scan' | 'type'
  /** Frase do leitor de tela (aria-live). */
  readonly announcement: string
  readonly earned: CheckInEarnedView | null
  readonly notice: CheckInNoticeModel | null
  readonly viewfinderStatus: ViewfinderStatus
  readonly cameraIssue: CameraIssue | null
  code: string[]
  readonly codeInvalid: boolean
  readonly typing: boolean
  readonly focusRequest: FocusRequest<CheckInFocusTarget> | null
  readonly setVideo: (video: HTMLVideoElement | null) => void
  readonly submitTyped: () => void
  readonly typeCode: () => void
  readonly switchToCamera: () => void
  readonly recover: () => void
}
