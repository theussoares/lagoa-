import { describe, expect, it } from 'vitest'
import { OTP_SEND_WINDOW_MINUTES } from '#shared/constants/domain'
import { otpWindowStart } from './otp-send-limit.rules'

describe('otpWindowStart', () => {
  it('starts the window the configured number of minutes before now', () => {
    const now = new Date('2026-10-06T14:00:00Z')
    expect(now.getTime() - otpWindowStart(now).getTime()).toBe(OTP_SEND_WINDOW_MINUTES * 60_000)
  })
})
