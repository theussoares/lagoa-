import { getRequestIP, readBody } from 'h3'
import { z } from 'zod'
import { PhoneNumberSchema } from '#shared/schemas/phone'
import { DEFAULT_OTP_CHANNEL, OtpChannelSchema } from '#shared/schemas/session'
import { failWith } from '../../utils/authResponse'
import { recordOtpChannel } from '../../utils/otpChannel'
import { logSecurityEvent } from '../../utils/securityLog'
import { createPhoneLogin, readBffConfig } from '../../utils/serverConfig'

const OtpBodySchema = z.object({
  phone: PhoneNumberSchema,
  channel: OtpChannelSchema.default(DEFAULT_OTP_CHANNEL),
})

export default defineEventHandler(async (event) => {
  const body = OtpBodySchema.safeParse(await readBody(event))
  if (!body.success) return failWith(event, 'invalidPhone')

  const config = readBffConfig()
  const recorded = await recordOtpChannel(
    {
      apiBaseUrl: config.apiBaseUrl,
      bffSharedSecret: config.bffSharedSecret,
      production: config.secureCookies,
      clientIp: getRequestIP(event, { xForwardedFor: true }),
    },
    body.data.phone,
    body.data.channel,
  )
  if (!recorded.ok) {
    logSecurityEvent(event, { event: 'auth.codeRequested', outcome: 'failure', code: recorded.code })
    return failWith(event, recorded.code)
  }

  const sent = await createPhoneLogin().sendCode(body.data.phone)
  logSecurityEvent(event, { event: 'auth.codeRequested', outcome: sent.ok ? 'success' : 'failure', code: sent.ok ? undefined : sent.code })
  return sent.ok ? { ok: true } : failWith(event, sent.code)
})
