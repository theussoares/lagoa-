import { ShopPhotoUploadSchema } from '#shared/schemas/shop'
import { callApi } from '../../../../utils/apiCall'
import { rejectInput } from '../../../../utils/authResponse'
import { parsedBody, uuidParam } from '../../../../utils/input'

export default defineEventHandler(async (event) => {
  const id = uuidParam(event, 'id')
  if (id === null) return rejectInput(event)
  const body = await parsedBody(event, ShopPhotoUploadSchema)
  if (body === null) return rejectInput(event)
  return callApi(event, { method: 'PUT', path: `/merchant/hits/${id}/photo`, body })
})
