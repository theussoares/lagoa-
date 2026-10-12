import { Body, Controller, type INestApplication, Param, Post, UnauthorizedException } from '@nestjs/common'
import { APP_FILTER } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { Logger } from '@nestjs/common'
import { AllExceptionsFilter } from './all-exceptions.filter'
import { DomainException } from './domain-exception'

@Controller('echo')
class EchoController {
  @Post()
  echo(@Body() body: unknown): unknown {
    return body
  }
  @Post('token/:phone')
  token(): never {
    throw new UnauthorizedException()
  }
  @Post('suspended')
  suspended(): never {
    throw new DomainException({ code: 'shopSuspended' })
  }
  @Post('missing/:id')
  missing(@Param('id') id: string): never {
    throw new DomainException({ code: 'notFound', entity: id === 'shop' ? 'shop' : 'card' })
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
  const warned: string[] = []
  const warnSpy = vi.spyOn(Logger.prototype, 'warn').mockImplementation((message: unknown) => {
    warned.push(String(message))
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
    warnSpy.mockRestore()
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

  it('logs a refused token as a security event with the route pattern, never the real URL', async () => {
    warned.length = 0
    await request(app.getHttpServer()).post('/echo/token/67991230374').set('x-vercel-id', 'gru1::abc').expect(401)
    expect(warned).toHaveLength(1)
    expect(JSON.parse(warned[0] ?? '')).toMatchObject({
      type: 'security',
      event: 'access.unauthorized',
      outcome: 'failure',
      method: 'POST',
      route: '/echo/token/:phone',
      code: 'unauthorized',
      requestId: 'gru1::abc',
    })
    expect(warned[0]).not.toContain('67991230374')
  })

  it('logs a rule refusal (403) as access denied, and leaves plain 404s out', async () => {
    warned.length = 0
    await request(app.getHttpServer()).post('/echo/suspended').expect(403)
    await request(app.getHttpServer()).post('/echo/missing/shop').expect(404)
    expect(warned.map((line) => JSON.parse(line).event)).toEqual(['access.denied'])
    expect(JSON.parse(warned[0] ?? '')).toMatchObject({ code: 'shopSuspended' })
  })
})
