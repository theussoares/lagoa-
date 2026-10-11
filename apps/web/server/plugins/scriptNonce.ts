import { addNonce, createNonce, nonceContentSecurityPolicy, nonceMetaTag } from '../utils/contentSecurityPolicy'

/** Cada HTML sai com um nonce novo: nos scripts que o Nuxt escreveu e no `script-src` do header desta resposta. */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:html', (html, { event }) => {
    const nonce = createNonce()
    const withNonce = (chunks: string[]): string[] => chunks.map((chunk) => addNonce(chunk, nonce))
    html.head = [nonceMetaTag(nonce), ...withNonce(html.head)]
    html.bodyPrepend = withNonce(html.bodyPrepend)
    html.body = withNonce(html.body)
    html.bodyAppend = withNonce(html.bodyAppend)
    setResponseHeader(event, 'Content-Security-Policy', nonceContentSecurityPolicy(nonce))
  })
})
