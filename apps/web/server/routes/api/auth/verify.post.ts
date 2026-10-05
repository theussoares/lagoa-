import { readBody } from 'h3'
import { z } from 'zod'
import { PhoneNumberSchema } from '#shared/schemas/phone'
import { LoginCodeSchema } from '#shared/schemas/session'
import { failWith } from '../../../utils/authResponse'
import { createPhoneLogin, readBffConfig } from '../../../utils/serverConfig'
import { startSession } from '../../../utils/sessionAccess'

const VerifyBodySchema = z.object({ phone: PhoneNumberSchema, code: LoginCodeSchema })

export default defineEventHandler(async (event) => {
  const body = VerifyBodySchema.safeParse(await readBody(event))
  if (!body.success) return failWith(event, 'invalidLoginCode')
  const verified = await createPhoneLogin().verifyCode(body.data.phone, body.data.code)
  if (!verified.ok) return failWith(event, verified.code)
  startSession(event, verified.value, { secure: readBffConfig().secureCookies })
  return { ok: true }
})
