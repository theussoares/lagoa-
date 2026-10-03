import { inject } from '@vercel/analytics'

export default defineNuxtPlugin(() => {
  inject({ mode: import.meta.dev ? 'development' : 'production' })
})
