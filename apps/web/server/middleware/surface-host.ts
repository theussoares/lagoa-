import { getRequestHeader, sendRedirect } from 'h3'
import { surfaceRedirect } from '../utils/surfaceRedirect'

/** Cliente em `app.` e lojista em `balcao.`: quem cai na superfície do outro host é levado ao host certo. */
export default defineEventHandler((event) => {
  const { customerUrl, merchantUrl } = useRuntimeConfig().public
  const target = surfaceRedirect(
    { customerUrl, merchantUrl },
    {
      method: event.method,
      host: getRequestHeader(event, 'x-forwarded-host') ?? getRequestHeader(event, 'host'),
      pathAndQuery: event.path,
    },
  )
  if (target !== null) return sendRedirect(event, target, 308)
})
