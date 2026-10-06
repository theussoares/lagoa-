import { callApi } from '../../utils/apiCall'
import { rejectInput } from '../../utils/authResponse'
import { parsedQuery } from '../../utils/input'
import { LimitQuerySchema } from '../../utils/schemas'

export default defineEventHandler((event) => {
  const query = parsedQuery(event, LimitQuerySchema)
  if (query === null) return rejectInput(event)
  return callApi(event, { method: 'GET', path: '/wallet/activity', query })
})
