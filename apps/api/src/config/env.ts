import { z } from 'zod'

const EnvSchema = z.object({
  PORT: z.coerce.number().int().default(3333),
  DATABASE_URL: z.string().min(1),
  SUPABASE_URL: z.url(),
  PII_ENCRYPTION_KEY: z.base64().length(44),
  PII_HASH_PEPPER: z.string().min(16),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
})

export type Env = z.infer<typeof EnvSchema>

export function parseEnv(source: NodeJS.ProcessEnv): Env {
  const parsed = EnvSchema.safeParse(source)
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ')
    throw new Error(`Invalid environment: ${fields}`)
  }
  return parsed.data
}
