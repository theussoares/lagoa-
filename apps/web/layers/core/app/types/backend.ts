import type { AuthService } from '../services/AuthService'
import type { ApiClient } from '../services/http/ApiClient'

/** O que o plugin do backend entrega ao app: o login e, no modo http, o cliente da API (`null` no mock). */
export interface BackendWiring {
  readonly auth: AuthService
  readonly api: ApiClient | null
}
