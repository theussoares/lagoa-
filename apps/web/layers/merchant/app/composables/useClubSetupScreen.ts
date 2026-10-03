import { focusFirstMatching } from '#layers/ui/app/composables/useFocus'
import { CLUB_SETUP_STEPS } from '../utils/clubSetupForm'
import { toCheckInPosterModel } from '../utils/posterModel'
import { toProgramPreview } from '../utils/programPreviewModel'
import type { ClubSetupScreen, SetupStepItem } from '../types/clubSetup'
import { MERCHANT_SIGN_IN_PATH } from './useMerchantSession'

/** Tela de criar o clube: dados do cadastro, foco, aviso ao sair e textos derivados. */
export function useClubSetupScreen(): ClubSetupScreen {
  const { t } = useI18n()
  const translate = useTranslate()
  const origin = useRequestURL().origin
  const setup = useClubSetup()
  const { step, form, shopErrors, programErrors, submitState, posterState } = setup
  const { approveForTesting } = useShopStatus()
  const { print } = usePrint()
  const fieldOptions = useProgramFieldOptions(computed(() => form.value.program))

  const shopName = computed(() => form.value.shop.name.trim())
  const steps = computed<SetupStepItem[]>(() => {
    const currentIndex = CLUB_SETUP_STEPS.indexOf(step.value)
    return CLUB_SETUP_STEPS.map((key, index) => ({ key, state: index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'next' }))
  })
  const preview = computed(() => toProgramPreview(form.value.program, shopName.value || t('clubSetup.preview.shopFallback'), translate))
  const poster = computed(() => (posterState.value.status === 'success' ? toCheckInPosterModel(posterState.value.poster, origin, translate) : null))
  const isPending = computed(() => posterState.value.status === 'success' && posterState.value.poster.status === 'pending')
  const submitError = computed(() => (submitState.value.status === 'error' ? submitState.value.code : null))

  async function approve(): Promise<void> {
    if (approveForTesting !== null && (await approveForTesting())) await setup.loadPoster()
  }

  // Etapa nova: o foco vai para o título, e o leitor de tela anuncia onde o lojista está.
  watch(step, async () => {
    await nextTick()
    focusFirstMatching('h1')
  })

  // "Continuar" que não avança leva o foco ao primeiro campo com erro.
  async function submitStep(): Promise<void> {
    const before = step.value
    if (before === 'reward') await setup.create()
    else setup.next()
    if (step.value !== before) return
    await nextTick()
    focusFirstMatching('form [aria-invalid="true"]')
  }

  // Fora do painel o rascunho só vive nesta aba: recarregar ou fechar perde o que foi
  // preenchido. Confirmar o celular de novo (login) guarda o rascunho; depois do cartaz, nada a perder.
  useLeaveGuard({
    when: () => step.value !== 'poster',
    allow: (to) => to.path === MERCHANT_SIGN_IN_PATH,
    message: () => t('clubSetup.leaveConfirm'),
    warnOnUnload: true,
  })

  return reactive({
    step,
    shopName,
    steps,
    form,
    shopErrors,
    programErrors,
    fieldOptions,
    creating: computed(() => submitState.value.status === 'creating'),
    submitError,
    preview,
    posterStatus: computed(() => posterState.value.status),
    poster,
    isPending,
    canApprove: approveForTesting !== null,
    submitStep,
    back: setup.back,
    setMode: setup.setMode,
    approve,
    print,
    retryPoster: setup.loadPoster,
  })
}
