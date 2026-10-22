/** Preço do Fundador, em centavos, para a conta de retorno da calculadora. */
export const FOUNDER_PRICE_CENTS = 7990

export interface RoiResult {
  extraRevenueCents: number
  netCents: number
  coversPlan: boolean
  returnsToCoverPlan: number
}

export function computeRoi(ticketCents: number, extraReturns: number): RoiResult {
  const extraRevenueCents = ticketCents * extraReturns
  return {
    extraRevenueCents,
    netCents: extraRevenueCents - FOUNDER_PRICE_CENTS,
    coversPlan: extraRevenueCents >= FOUNDER_PRICE_CENTS,
    returnsToCoverPlan: ticketCents > 0 ? Math.ceil(FOUNDER_PRICE_CENTS / ticketCents) : 0,
  }
}

/** Valor em reais no formato do idioma da página (a moeda é sempre o real). */
export function formatBrl(cents: number, locale: string): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'BRL' }).format(cents / 100)
}
