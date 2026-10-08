import type { WalletCard } from '#shared/schemas/loyaltyCard'
import type { CheckInCode, ShopJoinResult } from '#shared/schemas/shop'
import type { CheckInResult } from '#shared/schemas/visit'
import type { VisitQrCredential } from '#shared/schemas/visitQr'
import type { ErrorOf } from '#shared/types/errors'
import type { Result } from '#shared/types/result'
import type { CheckInError } from '../services/CheckInService'
import type { Ref } from 'vue'
import type { LoyaltyCardId } from '#shared/schemas/ids'
import type { FocusRequest } from '#layers/ui/app/types/focus'
import type { StampCardModel } from '#layers/ui/app/types/wallet'

/** De onde veio o código: muda como o erro é explicado e como a pessoa tenta de novo. */
export type CheckInSource = 'camera' | 'typed' | 'link'

/** Qual código a pessoa digita: o da visita (caixa, padrão) ou o do cartaz da loja (entrar no clube). */
export type CheckInCodeKind = 'visit' | 'shop'

/** O que o envio faz: entrar no clube (QR do cartaz) ou ganhar (QR da visita). */
export type CheckInIntent =
  | { readonly kind: 'join'; readonly code: CheckInCode }
  | { readonly kind: 'claim'; readonly credential: VisitQrCredential }

export type CheckInInputError = ErrorOf<'invalidShopQr' | 'invalidVisitQr'>
/** O conteúdo lido (câmera, link ou digitado) já separado em intenção ou código malformado. */
export type CheckInInput = Result<CheckInIntent, CheckInInputError>

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
  | { status: 'submitting'; source: CheckInSource; intent: CheckInIntent['kind'] }
  /** `card` é o cartão já atualizado; sem ele (rede caiu no meio) a tela mostra só o resumo. */
  | { status: 'earned'; result: CheckInResult; card: WalletCard | null }
  | { status: 'joined'; result: ShopJoinResult; card: WalletCard | null }
  | { status: 'error'; error: CheckInError; source: CheckInSource; intent: CheckInIntent['kind'] }

export interface CheckIn {
  state: Readonly<Ref<CheckInState>>
  /** Código malformado (`input` com erro) vira o estado de erro sem chamar o service. */
  submit: (input: CheckInInput, source: CheckInSource) => Promise<void>
  /** Repete a última tentativa (depois de falha de rede). */
  retry: () => Promise<void>
  reset: () => void
}

export type CheckInFocusTarget = 'earnedHeading' | 'joinedHeading' | 'code'
export type CheckInMode = 'scan' | 'type'
export type CameraIssue = 'denied' | 'unavailable'
/** `busy` registra uma visita; `joining` entra no clube (texto diferente, mesma câmera parada). */
export type ViewfinderStatus = 'busy' | 'joining' | 'scanning' | 'starting'

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

export interface CheckInJoinedModel {
  readonly title: string
  readonly lead: string
  /** "Seus 2 de boas-vindas entram na primeira compra.": só com boas-vindas ligadas e o cartão ainda sem visita. */
  readonly welcome: string | null
  readonly next: string
  /** Frase única para o leitor de tela anunciar a entrada. */
  readonly announcement: string
}

export interface CheckInJoinedView {
  readonly text: CheckInJoinedModel
  readonly card: StampCardModel | null
}

export interface CheckInScreen {
  readonly view: 'earned' | 'joined' | 'notice' | 'scan' | 'type'
  /** Frase do leitor de tela (aria-live). */
  readonly announcement: string
  readonly earned: CheckInEarnedView | null
  readonly joined: CheckInJoinedView | null
  readonly notice: CheckInNoticeModel | null
  readonly viewfinderStatus: ViewfinderStatus
  readonly cameraIssue: CameraIssue | null
  code: string[]
  readonly codeKind: CheckInCodeKind
  readonly codeLength: number
  readonly codeInvalid: boolean
  readonly typing: boolean
  readonly focusRequest: FocusRequest<CheckInFocusTarget> | null
  readonly setVideo: (video: HTMLVideoElement | null) => void
  readonly submitTyped: () => void
  readonly typeCode: () => void
  readonly switchCodeKind: () => void
  readonly switchToCamera: () => void
  readonly recover: () => void
}
