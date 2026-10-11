import { readBody } from 'h3'
import { z } from 'zod'
import { PhoneNumberSchema } from '#shared/schemas/phone'
import { LoginCodeSchema } from '#shared/schemas/session'
import { failWith } from '../../utils/authResponse'
import { logSecurityEvent } from '../../utils/securityLog'
import { createPhoneLogin, readBffConfig } from '../../utils/serverConfig'
import { startSession } from '../../utils/sessionAccess'

const VerifyBodySchema = z.object({ phone: PhoneNumberSchema, code: LoginCodeSchema })

export default defineEventHandler(async (event) => {
  const body = VerifyBodySchema.safeParse(await readBody(event))
  if (!body.success) return failWith(event, 'invalidLoginCode')
  const verified = await createPhoneLogin().verifyCode(body.data.phone, body.data.code)
  if (!verified.ok) {
    logSecurityEvent(event, { event: 'auth.login', outcome: 'failure', code: verified.code })
    return failWith(event, verified.code)
  }
  logSecurityEvent(event, { event: 'auth.login', outcome: 'success', userId: verified.value.userId })
  startSession(event, verified.value, { secure: readBffConfig().secureCookies })
  return { ok: true }
})
