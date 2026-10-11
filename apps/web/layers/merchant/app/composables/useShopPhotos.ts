import type { ShopPhotoKind } from '#shared/schemas/shop'
import type { ShopPhotosControl, ShopPhotoSendState } from '../types/shopPhoto'

const IDLE: ShopPhotoSendState = { status: 'idle' }

/** Logo e banner em Configurações: lê as atuais, reduz a escolhida no navegador e envia. */
export function useShopPhotos(): ShopPhotosControl {
  const { shopPhoto } = useMerchantServices()
  const { expire } = useMerchantSession()
  const { toPhotoUpload } = useImageResize()
  const { state, set } = useAsyncResult(() => shopPhoto.getPhotos())
  const send = ref<Readonly<Record<ShopPhotoKind, ShopPhotoSendState>>>({ logo: IDLE, banner: IDLE })

  function setSend(kind: ShopPhotoKind, value: ShopPhotoSendState): void {
    send.value = { ...send.value, [kind]: value }
  }

  async function choose(kind: ShopPhotoKind, file: File): Promise<void> {
    if (send.value[kind].status === 'sending') return
    setSend(kind, { status: 'sending' })
    const upload = await toPhotoUpload(file, kind)
    if (upload === null) return setSend(kind, { status: 'error', code: 'unreadable' })
    const result = await shopPhoto.uploadPhoto(kind, upload)
    if (result.ok) {
      set(result.value)
      return setSend(kind, { status: 'saved' })
    }
    if (result.error.code === 'unauthorized') return expire()
    setSend(kind, { status: 'error', code: result.error.code })
  }

  return {
    urls: computed(() => {
      const photos = state.value.status === 'success' ? state.value.value : null
      return { logo: photos?.logoUrl ?? null, banner: photos?.bannerUrl ?? null }
    }),
    loading: computed(() => state.value.status === 'loading'),
    send,
    choose,
  }
}
