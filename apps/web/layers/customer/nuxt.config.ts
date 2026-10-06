import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const nuxtPackageDir = dirname(fileURLToPath(import.meta.resolve('nuxt/package.json')))

export default defineNuxtConfig({
  // Rolagem padrão do Nuxt: o `router.options` da layer a embrulha em vez de substituí-la.
  alias: { '#nuxt-router-options': join(nuxtPackageDir, 'dist/pages/runtime/router.options.js') },
})
