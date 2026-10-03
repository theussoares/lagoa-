import { drizzle } from 'drizzle-orm/postgres-js'
import { eq, inArray } from 'drizzle-orm'
import postgres from 'postgres'
import { earnRateOf, unitOf } from '#shared/domain/programStrategies'
import { PhoneNumberSchema } from '#shared/schemas/phone'
import { PiiService } from '../common/pii.service'
import { parseEnv } from '../config/env'
import { toProgramRules } from '../programs/program-rules.mapper'
import * as schema from './schema'
import { SEED_OWNER_EMAIL, SEED_OWNER_ID, SEED_OWNER_PHONE, SEED_SHOPS } from './seed-data'

/**
 * `pnpm db:seed` cria os dados de exemplo (idempotente: não atualiza o que já existe);
 * `pnpm db:seed -- --reset` os remove, e falha enquanto houver cartões ou resgates ligados a eles.
 * Só roda com `ALLOW_SEED=true`, que fica no `.env` local de quem aponta para um banco de dev.
 */
async function main(): Promise<void> {
  if (process.env.ALLOW_SEED !== 'true') throw new Error('Refusing to seed: set ALLOW_SEED=true in a dev .env')
  const env = parseEnv(process.env)
  const client = postgres(env.DATABASE_URL, { prepare: false })
  const db = drizzle(client, { schema })
  const shopIds = SEED_SHOPS.map((shop) => shop.id)
  try {
    if (process.argv.includes('--reset')) {
      await db.transaction(async (tx) => {
        await tx.delete(schema.programs).where(inArray(schema.programs.shopId, shopIds))
        await tx.delete(schema.shops).where(inArray(schema.shops.id, shopIds))
        await tx.delete(schema.appUsers).where(eq(schema.appUsers.id, SEED_OWNER_ID))
      })
      console.log('Seed removed')
      return
    }
    const pii = new PiiService(env)
    await db.transaction(async (tx) => {
      await tx
        .insert(schema.appUsers)
        .values({
          id: SEED_OWNER_ID,
          emailEncrypted: pii.encryptEmail(SEED_OWNER_EMAIL),
          emailHash: pii.hashEmail(SEED_OWNER_EMAIL),
          phoneEncrypted: pii.encrypt(SEED_OWNER_PHONE),
          phoneHash: pii.hashPhone(PhoneNumberSchema.parse(SEED_OWNER_PHONE)),
        })
        .onConflictDoNothing()
      for (const { programId, program, ...shop } of SEED_SHOPS) {
        await tx.insert(schema.shops).values({ ...shop, ownerUserId: SEED_OWNER_ID }).onConflictDoNothing()
        const rules = toProgramRules(program)
        if (!rules.ok) throw new Error(`Seed shop ${shop.name} has an invalid program`)
        await tx
          .insert(schema.programs)
          .values({
            id: programId,
            shopId: shop.id,
            ...program,
            unit: unitOf(rules.value),
            earnPer: earnRateOf(rules.value).per,
          })
          .onConflictDoNothing()
      }
    })
    console.log(`Seed ok: ${SEED_SHOPS.length} shops`)
  } finally {
    await client.end()
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Seed failed')
  process.exitCode = 1
})
