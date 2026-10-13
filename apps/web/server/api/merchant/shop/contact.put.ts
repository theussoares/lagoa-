import { ShopContactUpdateSchema } from '#shared/schemas/shop'
import { callApi } from '../../../utils/apiCall'
import { rejectInput } from '../../../utils/authResponse'
import { parsedBody } from '../../../utils/input'

export default defineEventHandler(async (event) => {
  const body = await parsedBody(event, ShopContactUpdateSchema)
  if (body === null) return rejectInput(event)
  return callApi(event, { method: 'PUT', path: '/merchant/shop/contact', body })
})
