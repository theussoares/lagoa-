import { sql } from 'drizzle-orm'
import { char, check, index, integer, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { bytea, createdAt, primaryId } from './columns'
import { visitQrCancelReason, visitQrEarnKind, visitQrStatus } from './enums'
import { ledgerEntries } from './cards'
import { programs, shops } from './shops'
import { appUsers, customerProfiles } from './users'

/**
 * QR da visita: credencial de uso único gerada na hora da venda. O token só existe em claro no QR; aqui fica o
 * hash (SHA-256). O código curto (`visit_code`) é a alternativa digitada e é único entre os ativos da rede toda.
 */
export const visitQrs = pgTable(
  'visit_qrs',
  {
    id: primaryId(),
    shopId: uuid('shop_id')
      .notNull()
      .references(() => shops.id),
    /** Versão ativa do programa na emissão. */
    programId: uuid('program_id')
      .notNull()
      .references(() => programs.id),
    /** Quem atestou a venda; vira `ledger_entries.recorded_by`. */
    issuedBy: uuid('issued_by')
      .notNull()
      .references(() => appUsers.id),
    tokenHash: bytea('token_hash').notNull(),
    /** Em claro: é curto e só serve com a loja ativa; hash não protegeria 28⁵ combinações. 5 = `VISIT_CODE_LENGTH` (o drizzle-kit não resolve `#shared`). */
    visitCode: char('visit_code', { length: 5 }).notNull(),
    earnKind: visitQrEarnKind('earn_kind').notNull(),
    amountCents: integer('amount_cents'),
    status: visitQrStatus('status').notNull().default('active'),
    cancelReason: visitQrCancelReason('cancel_reason'),
    createdAt: createdAt(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    /** Zerado em `DELETE /customer/account`: o QR continua `claimed` sem apontar para a pessoa. */
    claimedBy: uuid('claimed_by').references(() => customerProfiles.userId),
    claimedAt: timestamp('claimed_at', { withTimezone: true }),
    ledgerEntryId: uuid('ledger_entry_id').references(() => ledgerEntries.id),
    /** Última recusa por janela antifraude: o QR continua ativo e o Balcão mostra até quando. */
    refusedAt: timestamp('refused_at', { withTimezone: true }),
    refusalAvailableAt: timestamp('refusal_available_at', { withTimezone: true }),
  },
  (t) => [
    // 1000000 = AMOUNT_MAX_CENTS (literal: o drizzle-kit não resolve `#shared`). `coalesce`: CHECK aprova NULL, e
    // `amount` sem valor dava NULL (não false) e passava.
    check(
      'visit_qrs_earn_check',
      sql`coalesce((${t.earnKind} = 'amount' AND ${t.amountCents} BETWEEN 1 AND 1000000) OR (${t.earnKind} = 'visit' AND ${t.amountCents} IS NULL), false)`,
    ),
    // Sem `claimed_by`: ele é apagado quando a conta sai.
    check('visit_qrs_claim_check', sql`(${t.status} = 'claimed') = (${t.claimedAt} IS NOT NULL AND ${t.ledgerEntryId} IS NOT NULL)`),
    check('visit_qrs_cancel_check', sql`(${t.status} = 'cancelled') = (${t.cancelReason} IS NOT NULL)`),
    check('visit_qrs_expiry_check', sql`${t.expiresAt} > ${t.createdAt}`),
    uniqueIndex('visit_qrs_token_hash_uq').on(t.tokenHash),
    uniqueIndex('visit_qrs_active_code_uq')
      .on(t.visitCode)
      .where(sql`${t.status} = 'active'`),
    // Replay pelo código: a linha mais nova (`order by created_at desc nulls last`, regra do CLAUDE.md).
    index('visit_qrs_code_created_idx').on(t.visitCode, t.createdAt.desc()),
    index('visit_qrs_shop_active_idx')
      .on(t.shopId)
      .where(sql`${t.status} = 'active'`),
    // `DELETE /customer/account` zera `claimed_by` por pessoa; só os usados entram no índice.
    index('visit_qrs_claimed_by_idx')
      .on(t.claimedBy)
      .where(sql`${t.claimedBy} IS NOT NULL`),
    uniqueIndex('visit_qrs_ledger_entry_uq')
      .on(t.ledgerEntryId)
      .where(sql`${t.ledgerEntryId} IS NOT NULL`),
  ],
)
