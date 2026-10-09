import { z } from 'zod'
import { callApi } from '../../../../utils/apiCall'
import { rejectInput } from '../../../../utils/authResponse'
import { parsedBody } from '../../../../utils/input'

const BodySchema = z.object({ code: z.string().trim().min(1) })

export default defineEventHandler(async (event) => {
  const body = await parsedBody(event, BodySchema)
  if (body === null) return rejectInput(event)
  return callApi(event, { method: 'POST', path: '/merchant/counter/redemptions/validate', body })
})
