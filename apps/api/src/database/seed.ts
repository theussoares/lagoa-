import { drizzle } from 'drizzle-orm/postgres-js'
import { eq, inArray } from 'drizzle-orm'
import postgres from 'postgres'
import { PhoneNumberSchema } from '#shared/schemas/phone'
import { PiiService } from '../common/pii.service'
import { parseEnv } from '../config/env'
import * as schema from './schema'
import { SEED_OWNER_EMAIL, SEED_OWNER_ID, SEED_OWNER_PHONE, SEED_SHOPS } from './seed-data'

/** `pnpm db:seed` cria os dados de exemplo (idempotente); `pnpm db:seed -- --reset` só os remove. */
async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') throw new Error('Refusing to seed in production')
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
        await tx
          .insert(schema.programs)
          .values({
            id: programId,
            shopId: shop.id,
            ...program,
            unit: program.mode === 'stamps' ? 'stamp' : 'point',
            earnPer: program.mode === 'pointsPerCurrency' ? 'real' : 'visit',
          })
          .onConflictDoNothing()
      }
    })
    console.log(`Seed ok: ${SEED_SHOPS.length} shops`)
  } finally {
    await client.end()
  }
}

void main()
