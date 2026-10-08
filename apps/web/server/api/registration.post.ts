import { CustomerRegistrationSchema } from '#shared/schemas/customer'
import { callApi } from '../utils/apiCall'
import { rejectInput } from '../utils/authResponse'
import { parsedBody } from '../utils/input'

/** O celular não passa por aqui: vem confirmado no token. O navegador só conta nome e e-mail. */
const BodySchema = CustomerRegistrationSchema.pick({ firstName: true, email: true })

export default defineEventHandler(async (event) => {
  const body = await parsedBody(event, BodySchema)
  if (body === null) return rejectInput(event)
  return callApi(event, { method: 'POST', path: '/customer/registration', body })
})
