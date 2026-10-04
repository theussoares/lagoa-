import type { IncomingMessage, ServerResponse } from 'node:http'
import { createApp } from './app.factory'

type Handler = (request: IncomingMessage, response: ServerResponse) => void

let handler: Promise<Handler> | undefined

/** Função da Vercel: o app sobe uma vez por instância e as chamadas seguintes reaproveitam o mesmo Express. */
async function boot(): Promise<Handler> {
  const app = await createApp()
  await app.init()
  const server: Handler = app.getHttpAdapter().getInstance()
  return server
}

export default async function serverless(request: IncomingMessage, response: ServerResponse): Promise<void> {
  handler ??= boot()
  try {
    ;(await handler)(request, response)
  } catch (error) {
    handler = undefined
    throw error
  }
}
