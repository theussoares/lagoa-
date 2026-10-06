import type { ThrottlerStorage } from '@nestjs/throttler'

/** O pacote não exporta o tipo do registro; derivamos da própria assinatura do storage. */
export type ThrottlerRecord = Awaited<ReturnType<ThrottlerStorage['increment']>>

/** O que o upsert devolve: contagem e quanto falta (em ms, pelo relógio do banco) para a janela e o bloqueio acabarem. */
export interface CounterRow {
  readonly hits: number
  readonly windowLeftMs: number
  readonly blockLeftMs: number
}

const toSeconds = (ms: number): number => Math.ceil(Math.max(0, ms) / 1000)

/**
 * Traduz a linha do contador no registro que o Throttler espera. Sem `blockDuration`, passou do limite = barrado até a
 * janela fechar; com ele, o bloqueio é o que o banco marcou em `blocked_until`.
 */
export function toStorageRecord(row: CounterRow, limit: number, blockDuration: number): ThrottlerRecord {
  const timeToExpire = toSeconds(row.windowLeftMs)
  const blockedByDeadline = row.blockLeftMs > 0
  const isBlocked = blockedByDeadline || (blockDuration <= 0 && row.hits > limit)
  const timeToBlockExpire = !isBlocked ? 0 : blockedByDeadline ? toSeconds(row.blockLeftMs) : timeToExpire
  return { totalHits: row.hits, timeToExpire, isBlocked, timeToBlockExpire }
}
