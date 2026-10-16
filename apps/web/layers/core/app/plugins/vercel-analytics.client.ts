import { inject } from '@vercel/analytics'

/** O token da visita vai no fragmento e o `?para=` do login pode levar destino; nada disso sai do navegador. */
function stripQueryAndHash(url: string): string {
  const parsed = new URL(url)
  return `${parsed.origin}${parsed.pathname}`
}

export default defineNuxtPlugin(() => {
  inject({
    mode: import.meta.dev ? 'development' : 'production',
    beforeSend: (event) => ({ ...event, url: stripQueryAndHash(event.url) }),
  })
})
