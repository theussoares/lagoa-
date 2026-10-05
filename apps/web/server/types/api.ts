/** Uma chamada fixa do BFF à API: o handler escolhe método e caminho; o navegador só fornece dados já validados. */
export interface ApiCall {
  readonly method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  readonly path: string
  readonly query?: Readonly<Record<string, string | number>>
  readonly body?: unknown
}
