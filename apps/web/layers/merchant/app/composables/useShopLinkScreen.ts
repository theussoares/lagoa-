import type { ShopContactForm, ShopContactFormErrorCode, ShopContactMessage, ShopContactSaveState, ShopLinkScreen } from '../types/shopContact'
import { formatWhatsapp, formFromContact, isFormErrorCode, toContactPreview, toContactUpdate, whatsappDigits } from '../utils/shopContactForm'

/** Tela "Botão do card": o que a pessoa digitou vale sobre o salvo, até salvar ou tirar o botão. */
export function useShopLinkScreen(): ShopLinkScreen {
  const { t } = useI18n()
  const { shopContact } = useMerchantServices()
  const { expire } = useMerchantSession()
  const { state: loaded, set } = useAsyncResult(() => shopContact.getContact())
  const state = ref<ShopContactSaveState>({ status: 'idle' })
  // `null` = ainda não mexeu: vale o que veio do servidor (derivado, não `watch immediate`).
  const typed = ref<ShopContactForm | null>(null)

  const saved = computed(() => (loaded.value.status === 'success' ? loaded.value.value.contact : null))
  const form = computed(() => typed.value ?? formFromContact(saved.value))
  const preview = computed(() => toContactPreview(form.value, t('shopContact.defaultLabel')))

  const fieldError = computed<ShopContactFormErrorCode | null>(() => {
    const current = state.value
    return current.status === 'error' && isFormErrorCode(current.code) ? current.code : null
  })
  const message = computed<ShopContactMessage | null>(() => {
    const current = state.value
    if (current.status === 'saved') return { tone: 'success', key: 'merchantShopLink.saved' }
    if (current.status === 'removed') return { tone: 'success', key: 'merchantShopLink.removed' }
    if (current.status === 'error' && fieldError.value === null) return { tone: 'error', key: `errors.${current.code}` }
    return null
  })

  function change(patch: Partial<ShopContactForm>): void {
    const next = patch.whatsapp === undefined ? patch : { ...patch, whatsapp: formatWhatsapp(whatsappDigits(patch.whatsapp)) }
    typed.value = { ...form.value, ...next }
    state.value = { status: 'idle' }
  }

  async function send(update: Parameters<typeof shopContact.saveContact>[0], done: ShopContactSaveState): Promise<void> {
    state.value = { status: 'saving' }
    const result = await shopContact.saveContact(update)
    if (!result.ok) {
      if (result.error.code === 'unauthorized') return expire()
      state.value = { status: 'error', code: result.error.code }
      return
    }
    set(result.value)
    typed.value = null
    state.value = done
  }

  async function save(): Promise<void> {
    if (state.value.status === 'saving') return
    const result = toContactUpdate(form.value)
    if (!result.ok) {
      state.value = { status: 'error', code: result.code }
      return
    }
    await send(result.update, { status: 'saved' })
  }

  async function remove(): Promise<void> {
    if (state.value.status === 'saving') return
    await send({ contact: null }, { status: 'removed' })
  }

  return reactive({
    loading: computed(() => loaded.value.status === 'loading'),
    form,
    hasSaved: computed(() => saved.value !== null),
    preview,
    state,
    fieldError,
    message,
    change,
    save,
    remove,
  })
}
