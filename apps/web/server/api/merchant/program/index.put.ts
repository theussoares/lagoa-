import { ProgramDraftSchema } from '#shared/schemas/program'
import { callApi } from '../../../utils/apiCall'
import { rejectInput } from '../../../utils/authResponse'
import { parsedBody } from '../../../utils/input'

export default defineEventHandler(async (event) => {
  const body = await parsedBody(event, ProgramDraftSchema)
  if (body === null) return rejectInput(event)
  return callApi(event, { method: 'PUT', path: '/merchant/program', body })
})
