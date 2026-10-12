/**
 * Pede uma linha a mais que a página: se ela vier, existe próxima página e o cursor é o último cliente mostrado.
 * Assim não precisa de outra consulta só para saber se acabou.
 */
export function pageOf<Row extends { readonly customerId: string }>(
  rows: readonly Row[],
  pageSize: number,
): { readonly items: Row[]; readonly nextCursor: string | null } {
  if (rows.length <= pageSize) return { items: [...rows], nextCursor: null }
  const items = rows.slice(0, pageSize)
  return { items, nextCursor: items[items.length - 1]?.customerId ?? null }
}
