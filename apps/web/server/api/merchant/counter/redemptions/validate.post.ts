import { z } from 'zod'
import { REDEMPTION_CODE_INPUT_MAX_LENGTH } from '#shared/constants/domain'
import { callApi } from '../../../../utils/apiCall'
import { rejectInput } from '../../../../utils/authResponse'
import { parsedBody } from '../../../../utils/input'

const BodySchema = z.object({ code: z.string().trim().min(1).max(REDEMPTION_CODE_INPUT_MAX_LENGTH) })

export default defineEventHandler(async (event) => {
  const body = await parsedBody(event, BodySchema)
  if (body === null) return rejectInput(event)
  return callApi(event, { method: 'POST', path: '/merchant/counter/redemptions/validate', body })
})
