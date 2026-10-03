/** Valor de `aria-describedby`: só os ids que existem agora, ou `undefined` quando não há nenhum. */
export function describedBy(ids: readonly (string | false | null | undefined)[]): string | undefined {
  const present = ids.filter((id): id is string => typeof id === 'string' && id !== '')
  return present.length > 0 ? present.join(' ') : undefined
}
