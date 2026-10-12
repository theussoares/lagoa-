import 'reflect-metadata'
import { Body, Controller, Module, Post } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import request from 'supertest'
import { afterEach, describe, expect, it } from 'vitest'
import { largeJsonParsers } from './route-body-limit'

@Controller()
class EchoController {
  @Post('v1/auth/otp')
  otp(@Body() body: unknown): { body: unknown } {
    return { body }
  }
}

@Module({ controllers: [EchoController] })
class EchoModule {}

let app: NestExpressApplication | undefined

afterEach(async () => {
  await app?.close()
})

/** Mesma montagem do `createApp`, sobre o Nest de verdade (o Express puro não reproduz a escolha de parsers do Nest). */
async function nestLikeCreateApp(): Promise<NestExpressApplication> {
  app = await NestFactory.create<NestExpressApplication>(EchoModule, { logger: false })
  for (const { path, handler } of largeJsonParsers()) app.use(path, handler)
  await app.init()
  return app
}

describe('largeJsonParsers inside a Nest app', () => {
  it('still parses JSON bodies on routes that are not in the large list', async () => {
    const nest = await nestLikeCreateApp()
    const response = await request(nest.getHttpServer()).post('/v1/auth/otp').send({ phone: '67999990001' }).expect(201)
    expect(response.body).toEqual({ body: { phone: '67999990001' } })
  })
})
