import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import helmet from 'helmet'
import { AppModule } from './app.module'
import { ENV } from './config/config.module'
import type { Env } from './config/env'

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule)
  const env = app.get<Env>(ENV)
  app.use(helmet())
  app.setGlobalPrefix('v1', { exclude: ['health'] })
  app.enableCors({ origin: env.CORS_ORIGIN.split(',') })
  app.enableShutdownHooks()
  await app.listen(env.PORT)
}

void bootstrap()
