const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function formatCurrency(cents: number): string {
  return brl.format(cents / 100)
}
