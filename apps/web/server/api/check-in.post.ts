import { z } from 'zod'
import { CheckInCodeSchema } from '#shared/schemas/shop'
import { callApi } from '../utils/apiCall'
import { rejectInput } from '../utils/authResponse'
import { parsedBody } from '../utils/input'

const BodySchema = z.object({ code: CheckInCodeSchema })

export default defineEventHandler(async (event) => {
  const body = await parsedBody(event, BodySchema)
  if (body === null) return rejectInput(event)
  return callApi(event, { method: 'POST', path: '/check-in', body })
})
