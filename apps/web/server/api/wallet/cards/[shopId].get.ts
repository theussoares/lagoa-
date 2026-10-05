import { callApi } from '../../../utils/apiCall'
import { rejectInput } from '../../../utils/authResponse'
import { uuidParam } from '../../../utils/input'

export default defineEventHandler((event) => {
  const shopId = uuidParam(event, 'shopId')
  if (shopId === null) return rejectInput(event)
  return callApi(event, { method: 'GET', path: `/wallet/cards/${shopId}` })
})
