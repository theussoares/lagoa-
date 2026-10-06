import { toCheckInPosterModel } from '../utils/posterModel'
import type { CheckInPosterModel } from '../types/poster'
import type { PosterReprint } from '../types/home'

/** Imprime o cartaz novo a partir do Início e só então dá o aviso por resolvido. */
export function usePosterReprint(onPrinted: () => Promise<void>): PosterReprint {
  const { poster: posterService, posterReprint } = useMerchantServices()
  const { print: openPrintDialog } = usePrint()
  const translate = useTranslate()
  const origin = useRequestURL().origin
  const poster = shallowRef<CheckInPosterModel | null>(null)
  const printing = ref(false)

  async function print(): Promise<void> {
    if (printing.value) return
    printing.value = true
    try {
      const result = await posterService.getPoster()
      if (!result.ok) return
      poster.value = toCheckInPosterModel(result.value, origin, translate)
      await nextTick()
      openPrintDialog()
      // Abrir a impressão já conta: o navegador não avisa se o lojista cancelou.
      await posterReprint.markPrinted()
      await onPrinted()
    } finally {
      poster.value = null
      printing.value = false
    }
  }

  return reactive({ poster, printing, print })
}
