import { createPhoneLogin, readBffConfig } from '../../../utils/serverConfig'
import { endSession, storedTokens } from '../../../utils/sessionAccess'

export default defineEventHandler(async (event) => {
  const { accessToken, refreshToken } = storedTokens(event)
  if (accessToken !== undefined && refreshToken !== undefined) await createPhoneLogin().signOut({ accessToken, refreshToken })
  endSession(event, { secure: readBffConfig().secureCookies })
  return { ok: true }
})
