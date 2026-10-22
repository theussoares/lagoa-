import { HitsQuerySchema } from '#shared/schemas/showcase'
import { callApi } from '../../utils/apiCall'
import { rejectInput } from '../../utils/authResponse'
import { parsedQuery } from '../../utils/input'

export default defineEventHandler((event) => {
  const query = parsedQuery(event, HitsQuerySchema)
  if (query === null) return rejectInput(event)
  return callApi(event, {
    method: 'GET',
    path: '/hits',
    query: {
      ...(query.group === undefined ? {} : { group: query.group }),
      ...(query.cursor === undefined ? {} : { cursor: query.cursor }),
    },
  })
})
