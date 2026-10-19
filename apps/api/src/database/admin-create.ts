import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { AdminInviteSchema } from '#shared/schemas/admin'
import { DrizzleAdminTeamRepository } from '../admin/team/drizzle-team.repository'
import { SupabaseAdminAuth } from '../admin/team/supabase-admin-auth'
import { AdminTeamService } from '../admin/team/team.service'
import { SystemClock } from '../common/clock'
import { PiiService } from '../common/pii.service'
import { parseEnv } from '../config/env'
import * as schema from './schema'

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`)
  return index === -1 ? undefined : process.argv[index + 1]
}

/**
 * `ALLOW_ADMIN_CREATE=1 pnpm --filter @lagoa/api admin:create --email <e-mail> --name "<nome>"`: o primeiro admin da rede
 * (os outros entram por convite no painel). Mesmo caminho do convite: conta no Supabase já com `role: admin`, e-mail de
 * convite, `admin_users` e `admin_events(kind='invite')`. Como `actor_admin_id` é obrigatório, o autor do evento é o
 * próprio admin criado, e `invited_by` fica vazio: é assim que a trilha mostra que ele nasceu pelo script.
 * Nunca roda em CI.
 */
async function main(): Promise<void> {
  if (process.env.ALLOW_ADMIN_CREATE !== '1') throw new Error('Refusing to run: set ALLOW_ADMIN_CREATE=1')
  if (process.env.CI) throw new Error('Refusing to run in CI')
  const invite = AdminInviteSchema.safeParse({ email: argument('email'), name: argument('name') })
  if (!invite.success) throw new Error('Usage: --email <e-mail> --name "<name>" (name with 2 to 80 characters)')
  const env = parseEnv(process.env)
  if (env.SUPABASE_SERVICE_ROLE_KEY === undefined) throw new Error('Refusing to run: SUPABASE_SERVICE_ROLE_KEY is not set')

  const client = postgres(env.DATABASE_URL, { prepare: false })
  try {
    const service = new AdminTeamService(new DrizzleAdminTeamRepository(drizzle(client, { schema })), new SupabaseAdminAuth(env), new PiiService(env), new SystemClock())
    const created = await service.bootstrap(invite.data)
    if (!created.ok) throw new Error(`Not created: ${created.error.code}`)
    // Só o id: o e-mail é dado pessoal e não vai para a saída (que pode acabar num log).
    console.log(`Admin ${created.value.id} created; the invite e-mail is on its way`)
  } finally {
    await client.end()
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'admin:create failed')
    process.exitCode = 1
  })
}
