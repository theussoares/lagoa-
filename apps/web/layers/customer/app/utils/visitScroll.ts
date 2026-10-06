import type { RouterScrollBehavior } from '../types/routerScroll'
import { hasVisitFragment } from './checkInInput'

/**
 * Embrulha a rolagem padrão do Nuxt (espera `page:finish`, volta ao topo, âncora, posição salva) com uma única
 * exceção: `#visita=<token>` não é `id` de elemento, então a rota é vista como sem fragmento.
 */
export function withoutVisitFragment(fallback: RouterScrollBehavior): RouterScrollBehavior {
  return function scrollBehavior(to, from, savedPosition) {
    if (!hasVisitFragment(to.hash) && !hasVisitFragment(from.hash)) return fallback(to, from, savedPosition)
    const clean = (route: typeof to): typeof to => (hasVisitFragment(route.hash) ? { ...route, hash: '', fullPath: route.path } : route)
    return fallback(clean(to), clean(from), savedPosition)
  }
}
