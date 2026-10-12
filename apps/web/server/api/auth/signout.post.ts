import { createPhoneLogin, readBffConfig } from '../../utils/serverConfig'
import { logSecurityEvent } from '../../utils/securityLog'
import { endSession, storedTokens } from '../../utils/sessionAccess'

export default defineEventHandler(async (event) => {
  const { accessToken, refreshToken } = storedTokens(event)
  if (accessToken !== undefined && refreshToken !== undefined) await createPhoneLogin().signOut({ accessToken, refreshToken })
  endSession(event, { secure: readBffConfig().secureCookies })
  logSecurityEvent(event, { event: 'auth.logout', outcome: 'success' })
  return { ok: true }
})
