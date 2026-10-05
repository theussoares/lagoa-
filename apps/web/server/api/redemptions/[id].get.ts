import { callApi } from '../../utils/apiCall'
import { rejectInput } from '../../utils/authResponse'
import { uuidParam } from '../../utils/input'

export default defineEventHandler((event) => {
  const id = uuidParam(event, 'id')
  if (id === null) return rejectInput(event)
  return callApi(event, { method: 'GET', path: `/redemptions/${id}` })
})
