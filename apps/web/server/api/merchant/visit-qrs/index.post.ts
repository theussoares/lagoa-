import { VisitQrIssueRequestSchema } from '#shared/schemas/visitQr'
import { callApi } from '../../../utils/apiCall'
import { rejectInput } from '../../../utils/authResponse'
import { parsedBody } from '../../../utils/input'

export default defineEventHandler(async (event) => {
  const body = await parsedBody(event, VisitQrIssueRequestSchema)
  if (body === null) return rejectInput(event)
  return callApi(event, { method: 'POST', path: '/merchant/visit-qrs', body })
})
