import { HitItemDraftSchema } from '#shared/schemas/hitItem'
import { callApi } from '../../../utils/apiCall'
import { rejectInput } from '../../../utils/authResponse'
import { parsedBody, uuidParam } from '../../../utils/input'

export default defineEventHandler(async (event) => {
  const id = uuidParam(event, 'id')
  if (id === null) return rejectInput(event)
  const body = await parsedBody(event, HitItemDraftSchema)
  if (body === null) return rejectInput(event)
  return callApi(event, { method: 'PATCH', path: `/merchant/hits/${id}`, body })
})
