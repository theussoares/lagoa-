import { Logger } from '@nestjs/common'
import type { ThrottlerStorage } from '@nestjs/throttler'
import { sql } from 'drizzle-orm'
import { z } from 'zod'
import type { Database } from '../database/database.module'
import { rateLimits } from '../database/schema'
import { type CounterRow, type ThrottlerRecord, toStorageRecord } from './throttle-window.rules'

/** Fração das requisições que também varre linhas vencidas: custo fixo e baixo, sem cron. */
export const SWEEP_PROBABILITY = 0.02
export const SWEEP_BATCH_SIZE = 200
/** Contador lento vira erro (a política fail-open/fail-closed decide) em vez de segurar a requisição. */
export const COUNTER_TIMEOUT_MS = 1500

export class RateLimitStorageUnavailableError extends Error {
  constructor() {
    super('Rate limit counter unavailable')
    this.name = 'RateLimitStorageUnavailableError'
  }
}

const RowSchema = z.object({ hits: z.number(), window_left_ms: z.number(), block_left_ms: z.number() })

export interface PostgresThrottlerStorageOptions {
  readonly random?: () => number
  readonly timeoutMs?: number
}

/**
 * Contador de janela fixa no Postgres, compartilhado por todas as instâncias da API (serverless). Uma ida ao banco por
 * requisição: o upsert atômico (a linha é travada pelo `ON CONFLICT`) conta, reabre a janela vencida e marca o bloqueio.
 * Tempo vem do `now()` do banco, não do relógio da instância. A chave que o guard entrega já é hash (sem dado pessoal).
 */
export class PostgresThrottlerStorage implements ThrottlerStorage {
  private readonly logger = new Logger('Throttler')
  private readonly random: () => number
  private readonly timeoutMs: number

  constructor(
    private readonly db: Database,
    options: PostgresThrottlerStorageOptions = {},
  ) {
    this.random = options.random ?? Math.random
    this.timeoutMs = options.timeoutMs ?? COUNTER_TIMEOUT_MS
  }

  async increment(key: string, ttl: number, limit: number, blockDuration: number, _throttlerName: string): Promise<ThrottlerRecord> {
    const row = await this.count(key, ttl, limit, blockDuration)
    if (this.random() < SWEEP_PROBABILITY) void this.sweep()
    return toStorageRecord(row, limit, blockDuration)
  }

  private async count(key: string, ttl: number, limit: number, blockDuration: number): Promise<CounterRow> {
    try {
      const rows = await withTimeout(this.upsert(key, ttl, limit, blockDuration), this.timeoutMs)
      const parsed = RowSchema.parse(rows[0])
      return { hits: parsed.hits, windowLeftMs: parsed.window_left_ms, blockLeftMs: parsed.block_left_ms }
    } catch (error) {
      // Só o nome do erro: a mensagem do driver pode trazer a query com seus valores.
      this.logger.error(`Counter failed (${error instanceof Error ? error.name : typeof error})`)
      throw new RateLimitStorageUnavailableError()
    }
  }

  private upsert(key: string, ttl: number, limit: number, blockDuration: number): PromiseLike<readonly Record<string, unknown>[]> {
    const t = rateLimits
    const window = sql`${ttl}::int * interval '1 millisecond'`
    // Dentro do DO UPDATE, `${t}.col` é a linha antiga. Bloqueio vigente congela tudo; janela vencida ou bloqueio já
    // vencido reabre a contagem em 1; senão soma 1 e, passando do limite com `blockDuration`, marca o bloqueio.
    const blocked = sql`${t.blockedUntil} > now()`
    const reopens = sql`${t.expiresAt} <= now() or ${t.blockedUntil} is not null`
    return this.db.execute(sql`
      insert into ${t} (key, hits, expires_at, blocked_until)
      values (${key}, 1, now() + ${window}, null)
      on conflict (key) do update set
        hits = case when ${blocked} then ${t.hits} when ${reopens} then 1 else ${t.hits} + 1 end,
        expires_at = case when ${blocked} then ${t.expiresAt} when ${reopens} then now() + ${window} else ${t.expiresAt} end,
        blocked_until = case
          when ${blocked} then ${t.blockedUntil}
          when ${reopens} then null
          when ${blockDuration}::int > 0 and ${t.hits} + 1 > ${limit}::int then now() + ${blockDuration}::int * interval '1 millisecond'
          else null
        end
      returning
        hits,
        (extract(epoch from (expires_at - now())) * 1000)::int as window_left_ms,
        (case when blocked_until is null then 0 else extract(epoch from (blocked_until - now())) * 1000 end)::int as block_left_ms
    `)
  }

  /** Apaga em lote o que já venceu (e não está bloqueado). Falha aqui é inofensiva: a próxima requisição tenta de novo. */
  private async sweep(): Promise<void> {
    const t = rateLimits
    try {
      await this.db.execute(sql`
        delete from ${t} where key in (
          select key from ${t}
          where expires_at < now() and (blocked_until is null or blocked_until < now())
          limit ${SWEEP_BATCH_SIZE} for update skip locked
        )
      `)
    } catch {
      // varredura oportunista
    }
  }
}

function withTimeout<T>(work: PromiseLike<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), ms)
  })
  return Promise.race([Promise.resolve(work), timeout]).finally(() => clearTimeout(timer))
}
