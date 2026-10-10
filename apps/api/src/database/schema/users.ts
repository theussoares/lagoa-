import { boolean, char, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { bytea, createdAt } from './columns'

/** `id` é o mesmo `auth.users.id` do Supabase: não há tabela de OTP. */
export const appUsers = pgTable('app_users', {
  id: uuid('id').primaryKey(),
  /** Nulos em quem entra só por celular (o e-mail é o canal alternativo de login). */
  emailEncrypted: bytea('email_encrypted'),
  emailHash: bytea('email_hash').unique(),
  phoneEncrypted: bytea('phone_encrypted').notNull(),
  phoneHash: bytea('phone_hash').notNull().unique(),
  /** Conta apagada: o celular vira buffer vazio e o painel nunca tenta decifrá-lo. */
  erasedAt: timestamp('erased_at', { withTimezone: true }),
  createdAt: createdAt(),
})

export const customerProfiles = pgTable('customer_profiles', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => appUsers.id),
  firstName: text('first_name'),
  birthday: char('birthday', { length: 5 }),
  birthdayChangedAt: timestamp('birthday_changed_at', { withTimezone: true }),
  referralCode: char('referral_code', { length: 8 }).notNull().unique(),
  termsAcceptedAt: timestamp('terms_accepted_at', { withTimezone: true }),
  /** Versão dos termos aceita (`TERMS_VERSION`): prova do que a pessoa leu, para auditoria LGPD. */
  termsVersion: text('terms_version'),
  notificationsConsent: boolean('notifications_consent').notNull().default(false),
  consentUpdatedAt: timestamp('consent_updated_at', { withTimezone: true }),
  /** Entrada voluntária no ranking da cidade; sair apaga o apelido. */
  rankingOptIn: boolean('ranking_opt_in').notNull().default(false),
  rankingName: text('ranking_name'),
})
