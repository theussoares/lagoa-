import type { ProfileScreen } from '../types/profile'

/** Perfil: consentimento, aniversário, aparência, dados pessoais e saída. */
export function useProfileScreen(): ProfileScreen {
  const { t } = useI18n()
  const toast = useToast()
  const { profile, account } = useCustomerServices()
  const { signOut } = useCustomerSession()
  const { state, reload, set } = useCustomerProfile()
  const consentSaving = ref(false)
  const exporter = useDataExport()
  const erasing = ref(false)
  const theme = useThemePreference()
  const themeLabels = useThemeChoiceLabels()
  const birthday = useBirthdayEditing({ state, set, reload })

  watch(state, (current) => {
    if (current.status === 'error' && current.error.code === 'unauthorized') void signOut()
  })

  async function changeConsent(granted: boolean): Promise<void> {
    consentSaving.value = true
    const result = await profile.setNotificationConsent(granted)
    consentSaving.value = false
    if (!result.ok) {
      toast.add({ color: 'error', icon: 'i-ph-warning-circle', title: t(`errors.${result.error.code}`) })
      return
    }
    set(result.value)
    toast.add({ color: 'success', icon: 'i-ph-check-circle', title: t('profile.consentSaved') })
  }

  async function downloadData(): Promise<void> {
    const failure = await exporter.download()
    if (failure === 'unauthorized') return void signOut()
    if (failure !== null) return void toast.add({ color: 'error', icon: 'i-ph-warning-circle', title: t(`errors.${failure}`) })
    toast.add({ color: 'success', icon: 'i-ph-check-circle', title: t('profile.dataDownloaded') })
  }

  async function eraseAccount(): Promise<void> {
    erasing.value = true
    const result = await account.eraseAccount()
    erasing.value = false
    if (!result.ok) return void toast.add({ color: 'error', icon: 'i-ph-warning-circle', title: t(`errors.${result.error.code}`) })
    toast.add({ color: 'success', icon: 'i-ph-check-circle', title: t('profile.erased') })
    await signOut()
  }

  return reactive({ state, reload, theme, themeLabels, consentSaving, birthday, exporter, erasing, changeConsent, downloadData, eraseAccount, signOut })
}
