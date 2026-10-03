import { type CanActivate, type ExecutionContext, Controller, Get, type INestApplication } from '@nestjs/common'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { Throttle, ThrottlerModule } from '@nestjs/throttler'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AllExceptionsFilter } from '../common/http/all-exceptions.filter'
import type { AuthenticatedRequest } from './auth.types'
import { UserThrottlerGuard } from './user-throttler.guard'

/** Auth falso que identifica o usuário pelo cabeçalho, no lugar do JWT. */
class HeaderAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const http = context.switchToHttp().getRequest<AuthenticatedRequest>()
    http.user = { id: String(http.headers['x-test-user']), email: undefined }
    return true
  }
}

@Controller('limited')
class LimitedController {
  @Get()
  @Throttle({ default: { limit: 2, ttl: 60_000 }, ip: { limit: 5, ttl: 60_000 } })
  ok(): { ok: true } {
    return { ok: true }
  }
}

describe('throttling after auth', () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          { name: 'default', ttl: 60_000, limit: 120 },
          { name: 'ip', ttl: 60_000, limit: 600, getTracker: (req) => String(req.ip ?? 'unknown') },
        ]),
      ],
      controllers: [LimitedController],
      providers: [
        // Mesma ordem do AppModule: auth primeiro, para o limite enxergar `request.user`.
        { provide: APP_GUARD, useClass: HeaderAuthGuard },
        { provide: APP_GUARD, useClass: UserThrottlerGuard },
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
      ],
    }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
  })

  afterAll(async () => app.close())

  const call = (user: string) => request(app.getHttpServer()).get('/limited').set('x-test-user', user)

  it('limits per user and answers 429 rateLimited', async () => {
    await call('user-a').expect(200)
    await call('user-a').expect(200)
    const blocked = await call('user-a').expect(429)
    expect(blocked.body).toEqual({ code: 'rateLimited' })
  })

  it('does not punish another user behind the same IP', async () => {
    await call('user-b').expect(200)
  })

  it('also caps the IP, so many accounts cannot add their limits up', async () => {
    // o teto do IP é 5; já contaram aqui 2 do user-a (a barrada não chega a contar) e 1 do user-b
    await call('user-c').expect(200)
    await call('user-d').expect(200)
    await call('user-e').expect(429)
  })
})
