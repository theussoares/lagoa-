import { index, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

/**
 * Contador do `@nestjs/throttler` compartilhado entre instâncias (ADR-0002). A chave já é um hash (rota + limite + usuário
 * ou IP), nunca dado pessoal. A migration cria a tabela UNLOGGED (o contador é descartável); o Drizzle não modela isso.
 */
export const rateLimits = pgTable(
  'rate_limits',
  {
    key: text('key').primaryKey(),
    hits: integer('hits').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    blockedUntil: timestamp('blocked_until', { withTimezone: true }),
  },
  (t) => [index('rate_limits_expires_idx').on(t.expiresAt)],
)
