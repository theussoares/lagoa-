import { describe, expect, it } from 'vitest'
import { SMS_SENDS_MAX_PER_WINDOW } from '#shared/constants/domain'
import { PhoneNumberSchema } from '#shared/schemas/phone'
import { Clock } from '../../common/clock'
import { createTestPii } from '../../test-support/pii'
import { SmsSendGate } from './sms-send-gate'
import { SmsSendLog } from './sms-send-log.repository'

const pii = createTestPii()
const PHONE = PhoneNumberSchema.parse('67991230374')
const OTHER = PhoneNumberSchema.parse('67991230375')

class FixedClock extends Clock {
  constructor(public current: Date) {
    super()
  }
  now(): Date {
    return this.current
  }
}

/** Mesma regra do SQL: grava se, na janela, o celular ainda está abaixo do teto. */
class InMemorySmsSendLog extends SmsSendLog {
  readonly sends: Array<{ hash: string; at: Date }> = []
  failing = false
  async tryRecord(phoneHash: Buffer, now: Date, windowStart: Date, max: number): Promise<boolean> {
    if (this.failing) throw new Error('database down')
    const hash = phoneHash.toString('hex')
    const inWindow = this.sends.filter((send) => send.hash === hash && send.at > windowStart).length
    if (inWindow >= max) return false
    this.sends.push({ hash, at: now })
    return true
  }
}

function setup() {
  const clock = new FixedClock(new Date('2026-10-06T14:00:00Z'))
  const log = new InMemorySmsSendLog()
  return { clock, log, gate: new SmsSendGate(log, pii, clock) }
}

describe('SmsSendGate', () => {
  it('lets a phone receive up to the limit and then holds the next one', async () => {
    const { gate } = setup()
    for (let sent = 0; sent < SMS_SENDS_MAX_PER_WINDOW; sent++) expect(await gate.allow(PHONE)).toBe(true)
    expect(await gate.allow(PHONE)).toBe(false)
  })

  it('counts each phone on its own', async () => {
    const { gate } = setup()
    for (let sent = 0; sent < SMS_SENDS_MAX_PER_WINDOW; sent++) await gate.allow(PHONE)
    expect(await gate.allow(OTHER)).toBe(true)
  })

  it('lets the phone try again once the window has passed', async () => {
    const { gate, clock } = setup()
    for (let sent = 0; sent < SMS_SENDS_MAX_PER_WINDOW; sent++) await gate.allow(PHONE)
    clock.current = new Date(clock.current.getTime() + 61 * 60_000)
    expect(await gate.allow(PHONE)).toBe(true)
  })

  it('never stores the phone itself, only its hash', async () => {
    const { gate, log } = setup()
    await gate.allow(PHONE)
    expect(JSON.stringify(log.sends)).not.toContain(PHONE)
  })

  it('lets the SMS go when the log is unavailable: login must not stop for a counter', async () => {
    const { gate, log } = setup()
    log.failing = true
    expect(await gate.allow(PHONE)).toBe(true)
  })
})
