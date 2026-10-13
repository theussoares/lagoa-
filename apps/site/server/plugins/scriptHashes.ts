import { hashContentSecurityPolicyMeta } from '../../../web/server/utils/contentSecurityPolicy'

/** A LP é pré-renderizada: o `script-src` vai por hash dos scripts inline, numa `<meta>` antes de todos eles. */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:html', (html) => {
    const page = [...html.head, ...html.bodyPrepend, ...html.body, ...html.bodyAppend].join('')
    html.head = [hashContentSecurityPolicyMeta(page), ...html.head]
  })
})
