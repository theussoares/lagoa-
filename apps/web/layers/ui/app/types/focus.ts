/** Pedido de foco: só o alvo e um id crescente (para pedir o mesmo alvo duas vezes). Nunca dado digitado. */
export interface FocusRequest<T extends string> {
  readonly target: T
  readonly id: number
}
