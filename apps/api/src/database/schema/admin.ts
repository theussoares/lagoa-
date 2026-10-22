import { index, pgTable, text, timestamp, uuid, type AnyPgColumn } from 'drizzle-orm/pg-core'
import { bytea, createdAt, primaryId } from './columns'

/** `id` é o mesmo `auth.users.id` do Supabase (conta de e-mail com MFA); sem vínculo com `app_users`, que é do celular. */
export const adminUsers = pgTable('admin_users', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  emailEncrypted: bytea('email_encrypted').notNull(),
  emailHash: bytea('email_hash').notNull().unique(),
  invitedBy: uuid('invited_by').references((): AnyPgColumn => adminUsers.id),
  disabledAt: timestamp('disabled_at', { withTimezone: true }),
  createdAt: createdAt(),
})

/** Trilha de quem convidou, desativou, reativou ou zerou o MFA de quem. `kind` espelha `AdminEventKind`. */
export const adminEvents = pgTable(
  'admin_events',
  {
    id: primaryId(),
    actorAdminId: uuid('actor_admin_id')
      .notNull()
      .references(() => adminUsers.id),
    kind: text('kind').notNull(),
    targetAdminId: uuid('target_admin_id')
      .notNull()
      .references(() => adminUsers.id),
    createdAt: createdAt(),
  },
  (t) => [index('admin_events_target_idx').on(t.targetAdminId, t.createdAt.desc())],
)
