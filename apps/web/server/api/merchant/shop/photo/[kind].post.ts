import { getRouterParam } from 'h3'
import { ShopPhotoKindSchema, ShopPhotoUploadSchema } from '#shared/schemas/shop'
import { callApi } from '../../../../utils/apiCall'
import { rejectInput } from '../../../../utils/authResponse'
import { parsedBody } from '../../../../utils/input'

export default defineEventHandler(async (event) => {
  const kind = ShopPhotoKindSchema.safeParse(getRouterParam(event, 'kind'))
  if (!kind.success) return rejectInput(event)
  const body = await parsedBody(event, ShopPhotoUploadSchema)
  if (body === null) return rejectInput(event)
  return callApi(event, { method: 'POST', path: `/merchant/shop/photo/${kind.data}`, body })
})
