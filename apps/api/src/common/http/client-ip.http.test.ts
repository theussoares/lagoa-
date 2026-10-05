import { type INestApplication, Controller, Get } from '@nestjs/common'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { Throttle, ThrottlerModule } from '@nestjs/throttler'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { UserThrottlerGuard } from '../../auth/user-throttler.guard'
import { AllExceptionsFilter } from './all-exceptions.filter'
import { BFF_CLIENT_IP_HEADER, BFF_SECRET_HEADER, bffClientIpMiddleware, clientIpOf } from './client-ip'

const SECRET = 'z'.repeat(32)

@Controller('open')
class OpenController {
  @Get()
  @Throttle({ ip: { limit: 2, ttl: 60_000 } })
  ok(): { ok: true } {
    return { ok: true }
  }
}

describe('IP limit behind the BFF', () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          { name: 'default', ttl: 60_000, limit: 120 },
          { name: 'ip', ttl: 60_000, limit: 600, getTracker: (req) => clientIpOf(req) },
        ]),
      ],
      controllers: [OpenController],
      providers: [
        { provide: APP_GUARD, useClass: UserThrottlerGuard },
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
      ],
    }).compile()
    app = moduleRef.createNestApplication()
    app.use(bffClientIpMiddleware(SECRET))
    await app.init()
  })

  afterAll(async () => app.close())

  const call = (ip: string, secret: string) =>
    request(app.getHttpServer()).get('/open').set(BFF_SECRET_HEADER, secret).set(BFF_CLIENT_IP_HEADER, ip)

  it('counts each real client separately, even though all arrive from the BFF', async () => {
    await call('203.0.113.1', SECRET).expect(200)
    await call('203.0.113.1', SECRET).expect(200)
    await call('203.0.113.1', SECRET).expect(429)
    await call('203.0.113.2', SECRET).expect(200)
  })

  it('does not let a stranger pick its own IP: a wrong secret falls back to the socket IP', async () => {
    await call('203.0.113.50', 'w'.repeat(32)).expect(200)
    await call('203.0.113.51', 'w'.repeat(32)).expect(200)
    // mesmo IP de socket para os dois: o terceiro é barrado, apesar de o "IP" informado ser outro
    await call('203.0.113.52', 'w'.repeat(32)).expect(429)
  })
})
