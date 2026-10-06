import { RedemptionRequestSchema } from '#shared/schemas/redemption'
import { callApi } from '../../utils/apiCall'
import { rejectInput } from '../../utils/authResponse'
import { parsedBody } from '../../utils/input'

export default defineEventHandler(async (event) => {
  const body = await parsedBody(event, RedemptionRequestSchema)
  if (body === null) return rejectInput(event)
  return callApi(event, { method: 'POST', path: '/redemptions', body })
})
