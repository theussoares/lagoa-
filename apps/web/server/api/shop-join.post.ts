import { callApi } from '../utils/apiCall'
import { rejectInput } from '../utils/authResponse'
import { shopJoinCall } from '../utils/checkInCalls'
import { requestBody } from '../utils/input'

export default defineEventHandler(async (event) => {
  const call = shopJoinCall(await requestBody(event))
  return call === null ? rejectInput(event) : callApi(event, call)
})
