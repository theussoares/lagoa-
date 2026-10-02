/** Assinatura mínima do `t` do vue-i18n que os mapeadores de tela usam. */
export type Translate = (key: string, named?: Record<string, unknown>, plural?: number) => string
