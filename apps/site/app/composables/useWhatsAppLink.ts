/** Link de conversa com a rede no WhatsApp, já com a mensagem de interesse. */
export function useWhatsAppLink(): ComputedRef<string> {
  const { whatsappNumber } = useRuntimeConfig().public
  const { t } = useI18n()

  return computed(() => {
    const text = encodeURIComponent(t('cta.whatsappMessage'))
    return `https://wa.me/${whatsappNumber}?text=${text}`
  })
}
