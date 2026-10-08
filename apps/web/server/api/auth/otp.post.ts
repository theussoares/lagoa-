import { readBody } from 'h3'
import { z } from 'zod'
import { PhoneNumberSchema } from '#shared/schemas/phone'
import { failWith } from '../../utils/authResponse'
import { createPhoneLogin } from '../../utils/serverConfig'

const OtpBodySchema = z.object({ phone: PhoneNumberSchema })

export default defineEventHandler(async (event) => {
  const body = OtpBodySchema.safeParse(await readBody(event))
  if (!body.success) return failWith(event, 'invalidPhone')
  const sent = await createPhoneLogin().sendCode(body.data.phone)
  return sent.ok ? { ok: true } : failWith(event, sent.code)
})
