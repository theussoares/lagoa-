export interface QrPath {
  /** Lado do quadrado em módulos, já com a margem. */
  readonly size: number
  /** Um `<path>` só com todos os módulos escuros: leve para desenhar e imprimir. */
  readonly d: string
}
