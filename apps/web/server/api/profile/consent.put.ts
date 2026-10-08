import { ConsentUpdateSchema } from '#shared/schemas/customer'
import { callApi } from '../../utils/apiCall'
import { rejectInput } from '../../utils/authResponse'
import { parsedBody } from '../../utils/input'

export default defineEventHandler(async (event) => {
  const body = await parsedBody(event, ConsentUpdateSchema)
  if (body === null) return rejectInput(event)
  return callApi(event, { method: 'PUT', path: '/customer/profile/consent', body })
})
