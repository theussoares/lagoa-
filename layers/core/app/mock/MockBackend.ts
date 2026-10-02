import type { LoginCode } from '#shared/schemas/session'
import type { MockContext, MockRuntime } from './handlers/context'
import { runMaintenance } from './handlers/maintenance'
import { cryptoRandom, systemClock, uuidIds } from './runtime'
import type { MockStore } from './MockStore'
import type { MockState } from './state'

export interface MockBackendOptions {
  readonly store: MockStore
  readonly seed: (now: Date) => MockState
  /** Código de login aceito pelo mock (o SMS não é enviado). */
  readonly loginCode: LoginCode
  readonly runtime?: Partial<MockRuntime>
  /** Atraso artificial para a UI exercitar estados de carregamento. */
  readonly latencyMs?: number
}

/**
 * Servidor falso compartilhado por cliente e lojista. Cada chamada carrega o
 * estado, roda os "jobs", executa o handler e salva — como uma requisição.
 */
export class MockBackend {
  readonly loginCode: LoginCode
  private readonly store: MockStore
  private readonly seed: (now: Date) => MockState
  private readonly runtime: MockRuntime
  private readonly latencyMs: number

  constructor(options: MockBackendOptions) {
    this.store = options.store
    this.seed = options.seed
    this.loginCode = options.loginCode
    this.latencyMs = options.latencyMs ?? 0
    this.runtime = {
      clock: options.runtime?.clock ?? systemClock,
      ids: options.runtime?.ids ?? uuidIds,
      random: options.runtime?.random ?? cryptoRandom,
    }
  }

  async run<T>(handler: (ctx: MockContext) => T): Promise<T> {
    await this.delay()
    const now = this.runtime.clock.now()
    const state = this.store.load() ?? this.seed(now)
    const ctx: MockContext = { state, now, ids: this.runtime.ids, random: this.runtime.random }
    runMaintenance(ctx)
    const result = handler(ctx)
    this.store.save(ctx.state)
    return result
  }

  /** Volta para os dados de exemplo. */
  reset(): void {
    this.store.save(this.seed(this.runtime.clock.now()))
  }

  private delay(): Promise<void> {
    if (this.latencyMs <= 0) return Promise.resolve()
    return new Promise((resolve) => setTimeout(resolve, this.latencyMs))
  }
}
