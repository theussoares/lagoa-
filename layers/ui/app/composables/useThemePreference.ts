import type { ThemePreference } from '../types/theme'

/** Claro ou escuro, guardado neste aparelho pelo `@nuxtjs/color-mode`. */
export function useThemePreference(): WritableComputedRef<ThemePreference> {
  const colorMode = useColorMode()
  return computed<ThemePreference>({
    get: () => (colorMode.preference === 'dark' ? 'dark' : 'light'),
    set: (value) => {
      colorMode.preference = value
    },
  })
}
