import { createClient } from '@supabase/supabase-js'
import { parseAllowedOrigins } from './originGuard'
import { PhoneLogin } from './phoneLogin'

export interface BffConfig {
  readonly apiBaseUrl: string
  readonly allowedOrigins: string[]
  readonly secureCookies: boolean
}

/** Tudo que o BFF lê do ambiente, num lugar só. Variáveis sem `NUXT_PUBLIC_`: nunca vão para o navegador. */
export function readBffConfig(): BffConfig {
  const config = useRuntimeConfig()
  return {
    apiBaseUrl: config.apiBaseUrl,
    allowedOrigins: parseAllowedOrigins(config.allowedOrigins),
    secureCookies: process.env.NODE_ENV === 'production',
  }
}

export function createPhoneLogin(): PhoneLogin {
  const config = useRuntimeConfig()
  const client = createClient(config.public.supabaseUrl, config.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  return new PhoneLogin(client)
}
