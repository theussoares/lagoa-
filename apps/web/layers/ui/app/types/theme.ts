/** Aparência escolhida pela pessoa. */
export type ThemePreference = 'light' | 'dark'

/** Cada superfície guarda a própria escolha: app do cliente (abre escuro) e painel (abre claro). */
export type ThemeSurface = 'customer' | 'merchant'

export interface ThemeChoiceLabels {
  readonly legend: string
  readonly light: string
  readonly dark: string
}
