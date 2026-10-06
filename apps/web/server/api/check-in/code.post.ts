import { callApi } from '../../utils/apiCall'
import { rejectInput } from '../../utils/authResponse'
import { visitCodeClaimCall } from '../../utils/checkInCalls'
import { requestBody } from '../../utils/input'

export default defineEventHandler(async (event) => {
  const call = visitCodeClaimCall(await requestBody(event))
  return call === null ? rejectInput(event) : callApi(event, call)
})
