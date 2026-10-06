import type { RouterConfig } from 'nuxt/schema'
import nuxtRouterOptions from '#nuxt-router-options'
import type { RouterScrollBehavior } from './types/routerScroll'
import { withoutVisitFragment } from './utils/visitScroll'

const nuxtScrollBehavior: RouterScrollBehavior = (to, from, savedPosition) => nuxtRouterOptions.scrollBehavior(to, from, savedPosition)

export default { scrollBehavior: withoutVisitFragment(nuxtScrollBehavior) } satisfies RouterConfig
