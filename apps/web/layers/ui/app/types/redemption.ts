/** Estado do canhoto que o cliente mostra no balcão, com o texto já traduzido. */
export type RedemptionTicketState =
  | {
      readonly kind: 'active'
      readonly code: string
      /** "9:42" */
      readonly clock: string
      /** "Vale por" */
      readonly clockLabel: string
      /** Último minuto: a contagem vira aviso. */
      readonly urgent: boolean
      /** Fração do prazo que ainda resta, de 0 a 1. */
      readonly remainingFraction: number
    }
  | { readonly kind: 'expired'; readonly code: string; readonly note: string }
  | { readonly kind: 'redeemed'; readonly seal: string; readonly note: string }
