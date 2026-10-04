import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import helmet from 'helmet'
import { AppModule } from './app.module'
import { ENV } from './config/config.module'
import { corsOrigins, type Env } from './config/env'

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)
  const env = app.get<Env>(ENV)
  app.set('trust proxy', env.TRUST_PROXY_HOPS ?? 0)
  app.use(helmet())
  app.setGlobalPrefix('v1', { exclude: ['health'] })
  app.enableCors({ origin: corsOrigins(env) })
  app.enableShutdownHooks()
  await app.listen(env.PORT)
}

void bootstrap()
