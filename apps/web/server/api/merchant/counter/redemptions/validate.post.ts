import { z } from 'zod'
import { callApi } from '../../../../utils/apiCall'
import { rejectInput } from '../../../../utils/authResponse'
import { parsedBody } from '../../../../utils/input'

/** O código tem 6 caracteres; a folga cobre espaço e hífen digitados, e barra lixo antes de gastar a chamada. */
const REDEMPTION_CODE_MAX_INPUT = 16
const BodySchema = z.object({ code: z.string().trim().min(1).max(REDEMPTION_CODE_MAX_INPUT) })

export default defineEventHandler(async (event) => {
  const body = await parsedBody(event, BodySchema)
  if (body === null) return rejectInput(event)
  return callApi(event, { method: 'POST', path: '/merchant/counter/redemptions/validate', body })
})
