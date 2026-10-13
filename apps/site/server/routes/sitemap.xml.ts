import { POSTS } from '../../app/content/posts'
import { GUIDE } from '../../app/content/guide'

/** Sitemap pré-renderizado: a LP é estática, então a lista de páginas sai dos arquivos de conteúdo. */
export default defineEventHandler((event) => {
  const siteUrl = (useRuntimeConfig(event).public.siteUrl as string).replace(/\/$/, '')
  const paths = ['/', '/blog', '/guia', ...POSTS.map((p) => `/blog/${p.slug}`), ...GUIDE.map((g) => `/guia/${g.slug}`)]
  const urls = paths.map((path) => `  <url><loc>${siteUrl}${path === '/' ? '' : path}</loc></url>`).join('\n')
  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
})
