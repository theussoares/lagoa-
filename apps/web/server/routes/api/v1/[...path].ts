import { failWith } from '../../../utils/authResponse'
import { forwardToApi } from '../../../utils/apiProxy'
import { readBffConfig } from '../../../utils/serverConfig'
import { resolveAccessToken } from '../../../utils/sessionAccess'

export default defineEventHandler(async (event) => {
  const config = readBffConfig()
  const token = await resolveAccessToken(event, { secure: config.secureCookies })
  if (!token.ok) return failWith(event, token.code)
  return forwardToApi(event, config.apiBaseUrl, token.value)
})
