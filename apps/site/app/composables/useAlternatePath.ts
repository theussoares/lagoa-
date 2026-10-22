import { guideSlugs } from '~/content/guide'
import { postSlugs } from '~/content/posts'
import type { SiteLocale } from '../types/locale'

/**
 * Caminho da página atual em outro idioma. Artigo e guia têm slug próprio em cada idioma, então o
 * slug é trocado aqui, na hora de desenhar: o seletor de idioma fica no cabeçalho, que renderiza antes da página.
 */
export function useAlternatePath(): (code: SiteLocale) => string {
  const route = useRoute()
  const locale = useSiteLocale()
  const localePath = useLocalePath()
  const switchLocalePath = useSwitchLocalePath()
  const getRouteBaseName = useRouteBaseName()

  return (code) => {
    const base = getRouteBaseName(route)
    const slug = String(route.params.slug ?? '')
    const slugs = base === 'blog-slug' ? postSlugs(locale.value, slug) : base === 'guia-slug' ? guideSlugs(locale.value, slug) : undefined
    return slugs && typeof base === 'string' ? localePath({ name: base, params: { slug: slugs[code] } }, code) : switchLocalePath(code)
  }
}
