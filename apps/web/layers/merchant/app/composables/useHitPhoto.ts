import type { ShopPhotoUpload } from '#shared/schemas/shop'
import type { HitPhotoControl } from '../types/hitItem'

/** Foto escolhida no formulário: reduzida no navegador e guardada até o "Salvar" enviar. */
export function useHitPhoto(): HitPhotoControl {
  const { toPhotoUpload } = useImageResize()
  const upload = ref<ShopPhotoUpload | null>(null)

  async function choose(file: File): Promise<boolean> {
    const reduced = await toPhotoUpload(file, 'banner')
    if (reduced === null) return false
    upload.value = reduced
    return true
  }

  return {
    upload,
    pendingUrl: computed(() => (upload.value === null ? null : `data:${upload.value.contentType};base64,${upload.value.dataBase64}`)),
    choose,
    clear: () => {
      upload.value = null
    },
  }
}
