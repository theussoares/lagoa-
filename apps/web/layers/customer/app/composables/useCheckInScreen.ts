import { CHECK_IN_CODE_LENGTH, VISIT_CODE_LENGTH } from '#shared/constants/domain'
import { useFocusRequest } from '#layers/ui/app/composables/useFocus'
import { linkIntent, toCheckInIntent } from '../utils/checkInInput'
import { toCheckInNotice } from '../utils/checkInModel'
import type {
  CameraIssue,
  CheckInCodeKind,
  CheckInFocusTarget,
  CheckInMode,
  CheckInScreen,
  CheckInState,
  ViewfinderStatus,
} from '../types/checkIn'

const STAMP_VIBRATION_MS = 15
/** Prêmio liberado bate duas vezes: o carimbo e o selo vermelho. */
const REWARD_VIBRATION_PATTERN = [15, 90, 35]

export function useCheckInScreen(): CheckInScreen {
  const translate = useTranslate()
  const { vibrate } = useHaptics()
  const { state, submit, retry, reset } = useCheckIn()
  useCustomerSessionGuard(() => [state.value])
  const codeKind = ref<CheckInCodeKind>('visit')
  const scanner = useQrScanner((content) => void submit(toCheckInIntent(content, 'camera', codeKind.value), 'camera'))
  const seenStamps = useSeenStamps()
  const { request: focusRequest, focus } = useFocusRequest<CheckInFocusTarget>()
  const earned = useCheckInEarnedView(state)
  const joined = useCheckInJoinedView(state)

  const mode = ref<CheckInMode>('scan')
  const cameraIssue = ref<CameraIssue | null>(null)
  const code = ref<string[]>([])
  const video = shallowRef<HTMLVideoElement | null>(null)

  const link = useCheckInLink((input) => void submit(input, 'link'))

  // Com link pendente a câmera nem liga: ninguém recebe pedido de permissão para um ganho que já veio pelo link.
  const shouldScan = computed(() => mode.value === 'scan' && state.value.status === 'idle' && !link.pending.value)
  watch(
    [shouldScan, video],
    ([scan, element]) => {
      if (scan && element) void scanner.start(element)
      else if (!scan) scanner.stop()
    },
    { immediate: true, flush: 'post' },
  )
  watch(scanner.status, (status) => {
    if (status !== 'denied' && status !== 'unavailable') return
    cameraIssue.value = status
    mode.value = 'type'
  })
  watch(state, (current) => void onStateChange(current))

  async function onStateChange(current: CheckInState): Promise<void> {
    if (current.status === 'earned') return celebrate(current)
    if (current.status === 'joined') return welcomeJoined()
    if (current.status !== 'error' || current.error.code === 'unauthorized' || current.source !== 'typed') return
    code.value = []
    await nextTick()
    focus('code')
  }

  async function celebrate(current: Extract<CheckInState, { status: 'earned' }>): Promise<void> {
    // A batida acontece aqui; a carteira não repete.
    if (current.card) seenStamps.remember({ [current.card.id]: current.card.balance })
    vibrate(earned.value?.text.moment === 'reward' ? REWARD_VIBRATION_PATTERN : STAMP_VIBRATION_MS)
    await nextTick()
    focus('earnedHeading')
  }

  async function welcomeJoined(): Promise<void> {
    await nextTick()
    focus('joinedHeading')
  }

  const notice = computed(() => {
    const current = state.value
    return current.status === 'error' ? toCheckInNotice(current.error, current.source, new Date(), translate) : null
  })
  const view = computed<CheckInScreen['view']>(() => {
    if (earned.value) return 'earned'
    if (joined.value) return 'joined'
    return notice.value ? 'notice' : mode.value
  })
  const viewfinderStatus = computed<ViewfinderStatus>(() => {
    if (state.value.status === 'submitting') return state.value.intent === 'join' ? 'joining' : 'busy'
    return scanner.status.value === 'scanning' ? 'scanning' : 'starting'
  })
  const codeInvalid = computed(() => {
    const current = state.value
    if (current.status !== 'error' || current.source !== 'typed') return false
    return current.error.code === 'invalidShopQr' || current.error.code === 'invalidVisitQr'
  })
  const codeLength = computed(() => (codeKind.value === 'visit' ? VISIT_CODE_LENGTH : CHECK_IN_CODE_LENGTH))
  const typing = computed(() => state.value.status === 'submitting' && state.value.source === 'typed')

  function switchToCamera(): void {
    cameraIssue.value = null
    reset()
    mode.value = 'scan'
  }

  function typeCode(): void {
    reset()
    mode.value = 'type'
  }

  async function switchCodeKind(): Promise<void> {
    reset()
    code.value = []
    codeKind.value = codeKind.value === 'visit' ? 'shop' : 'visit'
    await nextTick()
    focus('code')
  }

  return reactive({
    view,
    announcement: computed(() => earned.value?.text.announcement ?? joined.value?.text.announcement ?? ''),
    earned,
    joined,
    notice,
    viewfinderStatus,
    cameraIssue,
    code,
    codeKind,
    codeLength,
    codeInvalid,
    typing,
    focusRequest,
    setVideo: (element: HTMLVideoElement | null): void => {
      video.value = element
    },
    submitTyped: (): void => void submit(toCheckInIntent(code.value.join(''), 'typed', codeKind.value), 'typed'),
    typeCode,
    switchCodeKind: (): void => void switchCodeKind(),
    switchToCamera,
    recover: (): void => (notice.value?.recovery === 'retry' ? void retry() : switchToCamera()),
  })
}
