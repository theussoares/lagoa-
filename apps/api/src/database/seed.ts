import { drizzle } from 'drizzle-orm/postgres-js'
import { inArray } from 'drizzle-orm'
import postgres from 'postgres'
import { earnRateOf, unitOf } from '#shared/domain/programStrategies'
import { PhoneNumberSchema } from '#shared/schemas/phone'
import { PiiService } from '../common/pii.service'
import { parseEnv } from '../config/env'
import { toProgramRules } from '../programs/program-rules.mapper'
import * as schema from './schema'
import { SEED_SHOPS } from './seed-data'

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
        await tx.delete(schema.appUsers).where(inArray(schema.appUsers.id, SEED_SHOPS.map((shop) => shop.owner.id)))
      })
      console.log('Seed removed')
      return
    }
    const pii = new PiiService(env)
    await db.transaction(async (tx) => {
      for (const { programId, program, owner, ...shop } of SEED_SHOPS) {
        await tx
          .insert(schema.appUsers)
          .values({
            id: owner.id,
            emailEncrypted: pii.encryptEmail(owner.email),
            emailHash: pii.hashEmail(owner.email),
            phoneEncrypted: pii.encrypt(owner.phone),
            phoneHash: pii.hashPhone(PhoneNumberSchema.parse(owner.phone)),
          })
          .onConflictDoNothing()
        await tx.insert(schema.shops).values({ ...shop, ownerUserId: owner.id }).onConflictDoNothing()
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
