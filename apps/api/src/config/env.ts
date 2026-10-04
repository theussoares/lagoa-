import { z } from 'zod'

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().default(3333),
    DATABASE_URL: z.string().min(1),
    SUPABASE_URL: z.url(),
    PII_ENCRYPTION_KEY: z.base64().refine((key) => Buffer.from(key, 'base64').length === 32, 'must decode to 32 bytes'),
    /** `openssl rand -base64 32` dá 44 caracteres; menos de 32 é fraco demais para um segredo de HMAC. */
    PII_HASH_PEPPER: z.string().min(32),
    /** Quantos proxies (load balancer) existem na frente da API; define de onde vem o IP real. Obrigatório em produção. */
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).optional(),
    CORS_ORIGIN: z.string().default('http://localhost:3000'),
  })
  .superRefine((env, context) => {
    if (env.NODE_ENV !== 'production') return
    // Sem isso, atrás de um load balancer todo mundo parece vir do mesmo IP e o limite por IP vira global.
    if (env.TRUST_PROXY_HOPS === undefined) context.addIssue({ code: 'custom', path: ['TRUST_PROXY_HOPS'], message: 'required in production' })
    // O JWKS é buscado nesta URL: sem TLS, quem está no caminho troca a chave e assina o que quiser.
    if (!env.SUPABASE_URL.startsWith('https://')) context.addIssue({ code: 'custom', path: ['SUPABASE_URL'], message: 'must be https in production' })
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

/** `CORS_ORIGIN` aceita várias origens separadas por vírgula; espaços ao redor não contam. */
export function corsOrigins(env: Pick<Env, 'CORS_ORIGIN'>): string[] {
  return env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter((origin) => origin.length > 0)
}
