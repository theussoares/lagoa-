import type { ReminderDraft } from '#shared/schemas/campaign'
import { initialReminderDraft, reminderFieldErrors, withSuggestedBonus } from '../utils/reminderForm'
import type { ReminderFieldErrors, ReminderSendState, Campaigns } from '../types/campaign'

export function useCampaigns(defaultMessage: string): Campaigns {
  const { campaigns } = useMerchantServices()
  const { state, reload, set } = useAsyncResult(() => campaigns.getOverview())

  const draft = ref<ReminderDraft>(initialReminderDraft(defaultMessage))
  const sendState = shallowRef<ReminderSendState>({ status: 'idle' })
  const triedToSend = ref(false)

  const bonusLimits = computed(() => (state.value.status === 'success' ? state.value.value.bonusLimits : null))
  const reachable = computed(() => (state.value.status === 'success' ? state.value.value.reach.reachable : 0))
  const currentErrors = computed<ReminderFieldErrors>(() =>
    bonusLimits.value === null ? {} : reminderFieldErrors(draft.value, bonusLimits.value),
  )
  const fieldErrors = computed<ReminderFieldErrors>(() => (triedToSend.value ? currentErrors.value : {}))

  // O presente sugerido vem do programa: entra uma vez, quando o alcance chega.
  const stopSuggesting = watch(bonusLimits, (limits) => {
    if (limits === null) return
    draft.value = withSuggestedBonus(draft.value, limits)
    stopSuggesting()
  })

  // Mexer no lembrete depois de um envio tira o aviso antigo da tela.
  watch(draft, () => {
    if (sendState.value.status !== 'sending') sendState.value = { status: 'idle' }
  }, { deep: true })

  function validate(): boolean {
    triedToSend.value = true
    return bonusLimits.value !== null && Object.keys(currentErrors.value).length === 0 && reachable.value > 0
  }

  async function send(expectedRecipients: number): Promise<void> {
    if (sendState.value.status === 'sending' || !validate()) return
    sendState.value = { status: 'sending' }
    const result = await campaigns.sendReminder(draft.value, expectedRecipients)
    sendState.value = result.ok
      ? { status: 'sent', recipientsCount: result.value.recipientsCount }
      : { status: 'error', code: result.error.code }
    // Enviado ou recusado por alcance velho: busca o alcance do servidor sem esconder a tela.
    const reachIsStale = !result.ok && (result.error.code === 'noReachableCustomers' || result.error.code === 'reachChanged')
    if (result.ok || reachIsStale) await refreshOverview()
  }

  async function refreshOverview(): Promise<void> {
    const overview = await campaigns.getOverview()
    if (overview.ok) set(overview.value)
  }

  return { state, draft, bonusLimits, fieldErrors, reachable, sendState, reload, validate, send }
}
