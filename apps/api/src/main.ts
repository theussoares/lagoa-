import { createApp } from './app.factory'
import { ENV } from './config/config.module'
import type { Env } from './config/env'

async function bootstrap(): Promise<void> {
  const app = await createApp()
  app.enableShutdownHooks()
  await app.listen(app.get<Env>(ENV).PORT)
}

void bootstrap()
