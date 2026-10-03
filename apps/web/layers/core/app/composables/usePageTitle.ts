/** Título da aba: "<tela> · Lagoa+". Recebe a chave de tradução, nunca o texto. */
export function usePageTitle(key: string): void {
  const { t } = useI18n()
  useHead({ title: () => `${t(key)} · ${t('app.name')}` })
}
