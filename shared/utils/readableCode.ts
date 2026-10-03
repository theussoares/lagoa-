/**
 * Quem ouve "cinco" digita S, quem lê "8" digita B: como só um lado de cada par está no
 * alfabeto, a troca é segura. O/0 e I/1 saíram os dois, então continuam inválidos.
 */
const LOOKALIKES: Readonly<Record<string, string>> = { S: '5', B: '8', Z: '2', U: 'V' }

/** Aceita o que a pessoa digitar ("ab3 k9x", "nav-4k7") e devolve no formato do código. */
export function normalizeReadableCode(input: string): string {
  return input
    .replace(/[\s-]/g, '')
    .toUpperCase()
    .replace(/[SBZU]/g, (char) => LOOKALIKES[char] ?? char)
}
