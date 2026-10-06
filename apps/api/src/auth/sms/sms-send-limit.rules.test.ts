import { describe, expect, it } from 'vitest'
import { SMS_SEND_WINDOW_MINUTES } from '#shared/constants/domain'
import { smsWindowStart } from './sms-send-limit.rules'

describe('smsWindowStart', () => {
  it('starts the window the configured number of minutes before now', () => {
    const now = new Date('2026-10-06T14:00:00Z')
    expect(now.getTime() - smsWindowStart(now).getTime()).toBe(SMS_SEND_WINDOW_MINUTES * 60_000)
  })
})
