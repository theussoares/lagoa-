declare module '#nuxt-router-options' {
  import type { RouterScrollBehavior } from './routerScroll'

  const routerOptions: { scrollBehavior: RouterScrollBehavior }
  export default routerOptions
}
