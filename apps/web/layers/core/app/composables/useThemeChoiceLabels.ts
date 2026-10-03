import type { ComputedRef } from 'vue'
import type { ThemeChoiceLabels } from '#layers/ui/app/types/theme'

export function useThemeChoiceLabels(): ComputedRef<ThemeChoiceLabels> {
  const { t } = useI18n()
  return computed(() => ({ legend: t('theme.legend'), light: t('theme.light'), dark: t('theme.dark') }))
}
