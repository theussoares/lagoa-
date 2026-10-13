import type { ShopContactControl, ShopContactSaveState } from '../types/shopContact'
import { formatWhatsapp, toContactUpdate, whatsappDigits } from '../utils/shopContactForm'

/** WhatsApp e texto do botão em Configurações. O que a pessoa digitou vale sobre o salvo, até salvar de novo. */
export function useShopContact(): ShopContactControl {
  const { shopContact } = useMerchantServices()
  const { expire } = useMerchantSession()
  const { state: loaded, set } = useAsyncResult(() => shopContact.getContact())
  const state = ref<ShopContactSaveState>({ status: 'idle' })
  // `undefined` = ainda não mexeu: vale o que veio do servidor (derivado, não `watch immediate`).
  const typedWhatsapp = ref<string | undefined>(undefined)
  const typedLabel = ref<string | undefined>(undefined)

  const saved = computed(() => (loaded.value.status === 'success' ? loaded.value.value : null))
  const whatsapp = computed({
    get: () => typedWhatsapp.value ?? formatWhatsapp(saved.value?.whatsapp ?? ''),
    set: (value: string) => {
      typedWhatsapp.value = formatWhatsapp(whatsappDigits(value))
      state.value = { status: 'idle' }
    },
  })
  const ctaLabel = computed({
    get: () => typedLabel.value ?? saved.value?.ctaLabel ?? '',
    set: (value: string) => {
      typedLabel.value = value
      state.value = { status: 'idle' }
    },
  })

  async function save(): Promise<void> {
    if (state.value.status === 'saving') return
    const update = toContactUpdate(whatsapp.value, ctaLabel.value)
    if (update === null) {
      state.value = { status: 'error', code: 'invalidWhatsapp' }
      return
    }
    state.value = { status: 'saving' }
    const result = await shopContact.saveContact(update)
    if (!result.ok) {
      if (result.error.code === 'unauthorized') return expire()
      state.value = { status: 'error', code: result.error.code }
      return
    }
    set(result.value)
    typedWhatsapp.value = undefined
    typedLabel.value = undefined
    state.value = { status: 'saved' }
  }

  return { loading: computed(() => loaded.value.status === 'loading'), whatsapp, ctaLabel, state, save }
}
