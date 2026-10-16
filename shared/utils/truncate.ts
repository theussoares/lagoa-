/** Corta por code point (não por unidade UTF-16), para nunca deixar metade de um emoji. */
export function truncateCodePoints(text: string, max: number): string {
  return Array.from(text).slice(0, max).join('')
}
