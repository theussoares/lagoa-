import { setResponseStatus } from 'h3'

/** Sem isto o Nuxt responderia o HTML da SPA (200) a qualquer `/api/...` desconhecido. */
export default defineEventHandler((event) => {
  setResponseStatus(event, 404)
  return { code: 'notFound' }
})
