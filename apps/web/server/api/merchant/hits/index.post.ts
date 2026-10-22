import { HitItemDraftSchema } from '#shared/schemas/hitItem'
import { callApi } from '../../../utils/apiCall'
import { rejectInput } from '../../../utils/authResponse'
import { parsedBody } from '../../../utils/input'

export default defineEventHandler(async (event) => {
  const body = await parsedBody(event, HitItemDraftSchema)
  if (body === null) return rejectInput(event)
  return callApi(event, { method: 'POST', path: '/merchant/hits', body })
})
