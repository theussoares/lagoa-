import type { ThemePreference, ThemeSurface } from '../types/theme'

/** O app do cliente abre no escuro; o painel do lojista, no claro. */
const DEFAULT_THEME: Record<ThemeSurface, ThemePreference> = { customer: 'dark', merchant: 'light' }

function storageKey(surface: ThemeSurface): string {
  return `lagoa-theme-${surface}`
}

function readStored(surface: ThemeSurface): ThemePreference | null {
  try {
    const value = localStorage.getItem(storageKey(surface))
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

function writeStored(surface: ThemeSurface, value: ThemePreference): void {
  try {
    localStorage.setItem(storageKey(surface), value)
  } catch {
    // Sem armazenamento (janela privada): a escolha vale só até recarregar.
  }
}

/** Claro ou escuro por superfície, guardado neste aparelho; o painel e o app não compartilham a escolha. */
export function useThemePreference(surface: ThemeSurface): WritableComputedRef<ThemePreference> {
  const colorMode = useColorMode()
  const current = ref<ThemePreference>(readStored(surface) ?? DEFAULT_THEME[surface])
  colorMode.preference = current.value

  return computed<ThemePreference>({
    get: () => current.value,
    set: (value) => {
      current.value = value
      writeStored(surface, value)
      colorMode.preference = value
    },
  })
}
