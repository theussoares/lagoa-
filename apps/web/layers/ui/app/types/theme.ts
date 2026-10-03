/** Aparência escolhida pela pessoa. O app abre no claro; o escuro é opção. */
export type ThemePreference = 'light' | 'dark'

export interface ThemeChoiceLabels {
  readonly legend: string
  readonly light: string
  readonly dark: string
}
