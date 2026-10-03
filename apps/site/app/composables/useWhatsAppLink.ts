import { formatPhoneInput, phoneDigits } from '#shared/utils/phone'

interface WhatsAppContact {
  /** Link de conversa com a rede, já com a mensagem de interesse. */
  readonly href: ComputedRef<string>
  /** "(67) 99217-1768", para mostrar como texto. */
  readonly displayNumber: string
}

export function useWhatsAppLink(): WhatsAppContact {
  const { whatsappNumber } = useRuntimeConfig().public
  const { t } = useI18n()

  const href = computed(() => `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(t('cta.whatsappMessage'))}`)
  return { href, displayNumber: formatPhoneInput(phoneDigits(whatsappNumber)) }
}
