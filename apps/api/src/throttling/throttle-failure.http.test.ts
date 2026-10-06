import { type CanActivate, type ExecutionContext, Controller, Get, type INestApplication } from '@nestjs/common'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import { Throttle, ThrottlerModule } from '@nestjs/throttler'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { UserThrottlerGuard } from '../auth/user-throttler.guard'
import { AllExceptionsFilter } from '../common/http/all-exceptions.filter'
import { FailClosedThrottle } from './fail-closed-throttle'
import { RateLimitStorageUnavailableError } from './postgres-throttler.storage'

class AllowAll implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    context.switchToHttp().getRequest<{ user?: unknown }>().user = { id: 'u1' }
    return true
  }
}

@Controller('probe')
class ProbeController {
  @Get('open')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  open(): { ok: true } {
    return { ok: true }
  }

  @Get('closed')
  @FailClosedThrottle()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  closed(): { ok: true } {
    return { ok: true }
  }
}

describe('counter outage policy', () => {
  let app: INestApplication

  beforeAll(async () => {
    const down = {
      increment: async (): Promise<never> => {
        throw new RateLimitStorageUnavailableError()
      },
    }
    const moduleRef = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot({ storage: down, throttlers: [{ name: 'default', ttl: 60_000, limit: 120 }] })],
      controllers: [ProbeController],
      providers: [
        { provide: APP_GUARD, useClass: AllowAll },
        { provide: APP_GUARD, useClass: UserThrottlerGuard },
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
      ],
    }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
  })

  afterAll(async () => app.close())

  it('lets ordinary routes through (fail open)', async () => {
    await request(app.getHttpServer()).get('/probe/open').expect(200)
  })

  it('refuses a fail-closed route with 429 rateLimited', async () => {
    const res = await request(app.getHttpServer()).get('/probe/closed').expect(429)
    expect(res.body).toEqual({ code: 'rateLimited' })
  })
})
