/** Quanto falta, desenhado como no papel: casas de carimbo ou marca na régua, nunca barra. */
export type RulerProgress = { readonly kind: 'ruler'; readonly fraction: number }

export type ProgressModel = { readonly kind: 'slots'; readonly filled: number; readonly total: number } | RulerProgress

/** Tinta da régua: azul no caminho, vermelha quando o prêmio já está liberado. */
export type InkRuleTone = 'ink' | 'reward'
