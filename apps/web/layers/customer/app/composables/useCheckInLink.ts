import type { Ref } from 'vue'
import { linkIntent } from '../utils/checkInInput'
import type { CheckInInput } from '../types/checkIn'

/**
 * Link do QR aberto pela câmera do celular (`?loja=` do cartaz, `#visita=` da visita). O fragmento só existe
 * no navegador, então o envio é do `onMounted` (nunca do servidor), e o código sai da URL antes de enviar:
 * recarregar a página não tenta de novo. `pending` vale até o envio começar.
 */
export function useCheckInLink(send: (input: CheckInInput) => void): { pending: Readonly<Ref<boolean>> } {
  const route = useRoute()
  const router = useRouter()
  const link = linkIntent(route.query, route.hash)
  const pending = ref(link !== null)

  onMounted(() => {
    if (link === null) return
    void router.replace({ query: {}, hash: '' })
    send(link)
    pending.value = false
  })

  return { pending }
}
