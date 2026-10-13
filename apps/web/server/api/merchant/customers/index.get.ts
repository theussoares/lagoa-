import { z } from 'zod'
import { CustomerFilterSchema } from '#shared/schemas/customer'
import { callApi } from '../../../utils/apiCall'
import { rejectInput } from '../../../utils/authResponse'
import { parsedQuery } from '../../../utils/input'

const QuerySchema = z.object({ filter: CustomerFilterSchema.default('all'), cursor: z.uuid().optional() })

export default defineEventHandler((event) => {
  const query = parsedQuery(event, QuerySchema)
  if (query === null) return rejectInput(event)
  // Sem cursor (primeira página) o parâmetro nem vai: `undefined` viraria o texto "undefined" na URL.
  const { filter, cursor } = query
  return callApi(event, { method: 'GET', path: '/merchant/customers', query: cursor === undefined ? { filter } : { filter, cursor } })
})
