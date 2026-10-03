/**
 * Colunas que deixam as fileiras do mesmo tamanho (ou quase): 8 casas viram 4 + 4, não 5 + 3.
 * Nenhuma fileira passa de `maxPerRow`.
 */
export function slotColumns(total: number, maxPerRow: number): number {
  if (maxPerRow < 1) return 1
  if (total <= 0) return maxPerRow
  const rows = Math.ceil(total / maxPerRow)
  return Math.ceil(total / rows)
}

/**
 * Estilo da grade com casas sempre do tamanho que teriam numa fileira cheia: um cartão de 8
 * não ganha bolas maiores que um de 10, só fica mais estreito (e centrado).
 */
export function slotGridStyle(total: number, maxPerRow: number, gap: string): Record<string, string> {
  const columns = slotColumns(total, maxPerRow)
  return {
    gap,
    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
    width: `calc((100% - ${maxPerRow - 1} * ${gap}) * ${columns} / ${maxPerRow} + ${columns - 1} * ${gap})`,
  }
}
