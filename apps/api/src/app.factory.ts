import 'reflect-metadata'
import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import helmet from 'helmet'
import { AppModule } from './app.module'
import { ENV } from './config/config.module'
import { bffClientIpMiddleware } from './common/http/client-ip'
import { corsOrigins, type Env } from './config/env'

/** Monta o app igual para o servidor (`main.ts`) e para a função serverless (`serverless.ts`). */
export async function createApp(): Promise<NestExpressApplication> {
  // `rawBody`: o hook de SMS confere a assinatura sobre o corpo exato que o Supabase enviou.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true })
  const env = app.get<Env>(ENV)
  // O padrão é development (sem as checagens de produção): esquecer a variável no deploy não pode passar em silêncio.
  if (process.env.NODE_ENV === undefined) new Logger('Bootstrap').warn('NODE_ENV is not set: running with development defaults')
  app.set('trust proxy', env.TRUST_PROXY_HOPS ?? 0)
  app.use(bffClientIpMiddleware(env.BFF_SHARED_SECRET))
  app.use(helmet())
  app.setGlobalPrefix('v1', { exclude: ['health'] })
  app.enableCors({ origin: corsOrigins(env) })
  return app
}
