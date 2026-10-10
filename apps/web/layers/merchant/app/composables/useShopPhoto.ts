import type { ShopPhotoControl, ShopPhotoSendState } from '../types/shopPhoto'

/** Foto da loja em Configurações: lê a atual, reduz a escolhida no navegador e envia. */
export function useShopPhoto(): ShopPhotoControl {
  const { shopPhoto } = useMerchantServices()
  const { expire } = useMerchantSession()
  const { toPhotoUpload } = useImageResize()
  const { state, set } = useAsyncResult(() => shopPhoto.getPhoto())
  const send = ref<ShopPhotoSendState>({ status: 'idle' })

  async function choose(file: File): Promise<void> {
    if (send.value.status === 'sending') return
    send.value = { status: 'sending' }
    const upload = await toPhotoUpload(file)
    if (upload === null) {
      send.value = { status: 'error', code: 'unreadable' }
      return
    }
    const result = await shopPhoto.uploadPhoto(upload)
    if (result.ok) {
      set(result.value)
      send.value = { status: 'saved' }
      return
    }
    if (result.error.code === 'unauthorized') return expire()
    send.value = { status: 'error', code: result.error.code }
  }

  return {
    imageUrl: computed(() => (state.value.status === 'success' ? state.value.value.imageUrl : null)),
    loading: computed(() => state.value.status === 'loading'),
    send,
    choose,
  }
}
