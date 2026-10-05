import { CHECK_IN_LINK_PARAM } from '#shared/constants/domain'
import { useFocusRequest } from '#layers/ui/app/composables/useFocus'
import { toCheckInNotice } from '../utils/checkInModel'
import type { CameraIssue, CheckInFocusTarget, CheckInMode, CheckInScreen, CheckInState, ViewfinderStatus } from '../types/checkIn'

const STAMP_VIBRATION_MS = 15
/** Prêmio liberado bate duas vezes: o carimbo e o selo vermelho. */
const REWARD_VIBRATION_PATTERN = [15, 90, 35]

export function useCheckInScreen(): CheckInScreen {
  const route = useRoute()
  const router = useRouter()
  const translate = useTranslate()
  const { vibrate } = useHaptics()
  const { state, submit, retry, reset } = useCheckIn()
  useCustomerSessionGuard(() => [state.value])
  const scanner = useQrScanner((content) => void submit(content, 'camera'))
  const seenStamps = useSeenStamps()
  const { request: focusRequest, focus } = useFocusRequest<CheckInFocusTarget>()
  const earned = useCheckInEarnedView(state)

  const mode = ref<CheckInMode>('scan')
  const cameraIssue = ref<CameraIssue | null>(null)
  const code = ref<string[]>([])
  const video = shallowRef<HTMLVideoElement | null>(null)

  // Link do QR aberto pela câmera do celular: faz o check-in direto e tira o código da URL,
  // para recarregar a página não tentar de novo.
  const linkCode = route.query[CHECK_IN_LINK_PARAM]
  if (typeof linkCode === 'string') {
    void router.replace({ query: {} })
    void submit(linkCode, 'link')
  }

  const shouldScan = computed(() => mode.value === 'scan' && state.value.status === 'idle')
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

  const notice = computed(() => {
    const current = state.value
    return current.status === 'error' ? toCheckInNotice(current.error, current.source, new Date(), translate) : null
  })
  const view = computed<CheckInScreen['view']>(() => {
    if (earned.value) return 'earned'
    return notice.value ? 'notice' : mode.value
  })
  const viewfinderStatus = computed<ViewfinderStatus>(() => {
    if (state.value.status === 'submitting') return 'busy'
    return scanner.status.value === 'scanning' ? 'scanning' : 'starting'
  })
  const codeInvalid = computed(() => {
    const current = state.value
    return current.status === 'error' && current.source === 'typed' && current.error.code === 'invalidShopQr'
  })
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

  return reactive({
    view,
    announcement: computed(() => earned.value?.text.announcement ?? ''),
    earned,
    notice,
    viewfinderStatus,
    cameraIssue,
    code,
    codeInvalid,
    typing,
    focusRequest,
    setVideo: (element: HTMLVideoElement | null): void => {
      video.value = element
    },
    submitTyped: (): void => void submit(code.value.join(''), 'typed'),
    typeCode,
    switchToCamera,
    recover: (): void => (notice.value?.recovery === 'retry' ? void retry() : switchToCamera()),
  })
}
