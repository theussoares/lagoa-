import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { VISIT_CODE_LENGTH } from '#shared/constants/domain'
import { planVisitQrIssue, visitQrExpiresAt } from '#shared/domain/visitQr'
import { parseCheckInCode, visitQrLink } from '#shared/utils/checkInCode'
import { generateReadableCode } from '../common/readable-code'
import { generateVisitToken, hashVisitToken } from '../common/visit-token'
import { parseEnv } from '../config/env'
import { toProgramRules } from '../programs/program-rules.mapper'
import * as schema from './schema'

const DEFAULT_APP_ORIGIN = 'http://localhost:3000'

/**
 * `pnpm --filter @lagoa/api visit-qr:dev <checkInCode> [amountCents]` emite um QR da visita direto no banco de dev,
 * para testar o app do cliente de verdade enquanto a API do lojista (`merchant/visit-qrs`) não existe. Faz o que a
 * emissão fará: lê a loja e o programa ativo, aplica `planVisitQrIssue`, guarda só o hash do token e grava o dono da
 * loja como emissor. Imprime o link e o código curto. Só roda com `ALLOW_DEV_VISIT_QR=1` e fora de production.
 */
async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') throw new Error('Refusing to issue a dev visit QR in production')
  if (process.env.ALLOW_DEV_VISIT_QR !== '1') throw new Error('Refusing to issue a dev visit QR: set ALLOW_DEV_VISIT_QR=1 in a dev .env')

  const [rawCode, rawAmount] = process.argv.slice(2).filter((arg) => arg !== '--')
  if (rawCode === undefined) throw new Error('Usage: visit-qr:dev <checkInCode> [amountCents]')
  const checkInCode = parseCheckInCode(rawCode)
  if (!checkInCode.ok) throw new Error('Invalid shop code')
  const amountCents = rawAmount === undefined ? undefined : Number(rawAmount)
  if (amountCents !== undefined && !Number.isInteger(amountCents)) throw new Error('amountCents must be an integer number of cents')

  const env = parseEnv(process.env)
  const client = postgres(env.DATABASE_URL, { prepare: false })
  const db = drizzle(client, { schema })
  try {
    const [shop] = await db
      .select({ id: schema.shops.id, ownerUserId: schema.shops.ownerUserId, status: schema.shops.status })
      .from(schema.shops)
      .where(eq(schema.shops.checkInCode, checkInCode.value))
    if (!shop) throw new Error('No shop with that code')
    if (shop.status !== 'approved') throw new Error(`Shop is ${shop.status}: customers could not use the QR`)

    const [program] = await db
      .select({ id: schema.programs.id, mode: schema.programs.mode, earnUnits: schema.programs.earnUnits, target: schema.programs.target })
      .from(schema.programs)
      .where(and(eq(schema.programs.shopId, shop.id), eq(schema.programs.active, true)))
    if (!program) throw new Error('The shop has no active program')
    const rules = toProgramRules(program)
    if (!rules.ok) throw new Error('The active program is invalid')
    const earn = planVisitQrIssue(rules.value, amountCents)
    if (!earn.ok) throw new Error(`Cannot issue: ${earn.error.code}`)

    const token = generateVisitToken()
    const visitCode = await freeVisitCode(db)
    const createdAt = new Date()
    await db.insert(schema.visitQrs).values({
      shopId: shop.id,
      programId: program.id,
      issuedBy: shop.ownerUserId,
      tokenHash: hashVisitToken(token),
      visitCode,
      earnKind: earn.value.kind,
      amountCents: earn.value.kind === 'amount' ? earn.value.amountCents : null,
      createdAt,
      expiresAt: visitQrExpiresAt(createdAt),
    })
    console.log(`Link: ${visitQrLink(process.env.APP_URL ?? DEFAULT_APP_ORIGIN, token)}`)
    console.log(`Code: ${visitCode}`)
    console.log(`Valid until: ${visitQrExpiresAt(createdAt).toISOString()}`)
  } finally {
    await client.end()
  }
}

/** O índice único vale entre os ativos da rede toda; sortear de novo evita bater nele. */
async function freeVisitCode(db: ReturnType<typeof drizzle<typeof schema>>): Promise<string> {
  for (;;) {
    const code = generateReadableCode(VISIT_CODE_LENGTH)
    const [taken] = await db
      .select({ id: schema.visitQrs.id })
      .from(schema.visitQrs)
      .where(and(eq(schema.visitQrs.visitCode, code), eq(schema.visitQrs.status, 'active')))
      .limit(1)
    if (!taken) return code
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Could not issue the visit QR')
  process.exitCode = 1
})
