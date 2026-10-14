import { randomBytes } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { corsOrigins, parseEnv } from './env'

const providers = {
  WHATSAPP_ACCESS_TOKEN: 'token',
  WHATSAPP_PHONE_NUMBER_ID: '123456789',
  COMTELE_AUTH_KEY: 'comtele',
  SEND_SMS_HOOK_SECRET: 'v1,whsec_abc',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role',
  BFF_SHARED_SECRET: 'b'.repeat(32),
}

const valid = (): NodeJS.ProcessEnv => ({
  DATABASE_URL: 'postgresql://x',
  SUPABASE_URL: 'https://project.supabase.co',
  PII_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
  PII_HASH_PEPPER: randomBytes(32).toString('base64'),
})

describe('parseEnv', () => {
  it('accepts a complete environment with safe defaults for development', () => {
    expect(parseEnv(valid())).toMatchObject({ NODE_ENV: 'development', PORT: 3333, CORS_ORIGIN: 'http://localhost:3000' })
  })

  it.each(['DATABASE_URL', 'SUPABASE_URL', 'PII_ENCRYPTION_KEY', 'PII_HASH_PEPPER'])('fails fast without %s, naming only the field', (key) => {
    const env = valid()
    delete env[key]
    expect(() => parseEnv(env)).toThrow(`Invalid environment: ${key}`)
  })

  it('refuses an encryption key that is not 32 bytes', () => {
    expect(() => parseEnv({ ...valid(), PII_ENCRYPTION_KEY: randomBytes(31).toString('base64') })).toThrow('PII_ENCRYPTION_KEY')
  })

  it('refuses a weak pepper', () => {
    expect(() => parseEnv({ ...valid(), PII_HASH_PEPPER: 'short-pepper-1234567' })).toThrow('PII_HASH_PEPPER')
  })

  it('requires both OTP providers, hook secret, service role and BFF secret in production', () => {
    const production = { ...valid(), NODE_ENV: 'production', TRUST_PROXY_HOPS: '1' }
    expect(() => parseEnv(production)).toThrow(
      'WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, COMTELE_AUTH_KEY, SEND_SMS_HOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY, BFF_SHARED_SECRET',
    )
    expect(parseEnv({ ...production, ...providers })).toMatchObject({
      WHATSAPP_TEMPLATE_NAME: 'lagoa_login_code',
      WHATSAPP_TEMPLATE_LANGUAGE: 'pt_BR',
      WHATSAPP_GRAPH_VERSION: 'v23.0',
      COMTELE_ROUTE: 17,
    })
  })

  it.each(['COMTELE_AUTH_KEY', 'BFF_SHARED_SECRET'] as const)('refuses production without %s', (key) => {
    const { [key]: _omitted, ...rest } = providers
    expect(() => parseEnv({ ...valid(), NODE_ENV: 'production', TRUST_PROXY_HOPS: '1', ...rest })).toThrow(key)
  })

  it('validates WhatsApp configuration formats', () => {
    expect(() => parseEnv({ ...valid(), WHATSAPP_PHONE_NUMBER_ID: '+556799123' })).toThrow('WHATSAPP_PHONE_NUMBER_ID')
    expect(() => parseEnv({ ...valid(), WHATSAPP_GRAPH_VERSION: '23.0' })).toThrow('WHATSAPP_GRAPH_VERSION')
  })

  it('requires the proxy hop count and https in production', () => {
    expect(() => parseEnv({ ...valid(), NODE_ENV: 'production' })).toThrow('TRUST_PROXY_HOPS')
    expect(() => parseEnv({ ...valid(), NODE_ENV: 'production', TRUST_PROXY_HOPS: '1', SUPABASE_URL: 'http://project.supabase.co' })).toThrow('SUPABASE_URL')
    expect(
      parseEnv({ ...valid(), NODE_ENV: 'production', TRUST_PROXY_HOPS: '1', ...providers }),
    ).toMatchObject({ TRUST_PROXY_HOPS: 1 })
  })
})

describe('corsOrigins', () => {
  it('trims and drops empty entries', () => {
    expect(corsOrigins({ CORS_ORIGIN: ' https://a.com , https://b.com,, ' })).toEqual(['https://a.com', 'https://b.com'])
  })

  it('keeps test approval off by default and refuses it in production', () => {
    expect(parseEnv(valid()).ENABLE_TEST_APPROVE).toBe('0')
    const production = { ...valid(), NODE_ENV: 'production', TRUST_PROXY_HOPS: '1', ...providers }
    expect(() => parseEnv({ ...production, ENABLE_TEST_APPROVE: '1' })).toThrow('ENABLE_TEST_APPROVE')
  })
})
