import { Body, Controller, type INestApplication, Post } from '@nestjs/common'
import { APP_FILTER } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { Logger } from '@nestjs/common'
import { AllExceptionsFilter } from './all-exceptions.filter'

@Controller('echo')
class EchoController {
  @Post()
  echo(@Body() body: unknown): unknown {
    return body
  }
  @Post('boom')
  boom(): never {
    throw new Error('driver says: key (phone_hash)=(secret)')
  }
}

describe('AllExceptionsFilter', () => {
  let app: INestApplication
  const logged: string[] = []
  const spy = vi.spyOn(Logger.prototype, 'error').mockImplementation((message: unknown) => {
    logged.push(String(message))
  })

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [EchoController],
      providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }],
    }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
  })

  afterAll(async () => {
    await app.close()
    spy.mockRestore()
  })

  it('answers a body that is too large with 413 payloadTooLarge and no error log (the client did it, not us)', async () => {
    logged.length = 0
    const response = await request(app.getHttpServer()).post('/echo').send({ blob: 'x'.repeat(200_000) }).expect(413)
    expect(response.body).toEqual({ code: 'payloadTooLarge' })
    expect(logged).toHaveLength(0)
  })

  it('answers broken JSON with 400 requestFailed and never echoes it back', async () => {
    const response = await request(app.getHttpServer()).post('/echo').set('Content-Type', 'application/json').send('{"phone": "67991230374"').expect(400)
    expect(response.body).toEqual({ code: 'requestFailed' })
  })

  it('answers an unexpected error with 500 internal, logging only its type', async () => {
    logged.length = 0
    const response = await request(app.getHttpServer()).post('/echo/boom').expect(500)
    expect(response.body).toEqual({ code: 'internal' })
    expect(logged).toHaveLength(1)
    expect(logged[0]).not.toContain('secret')
  })
})
