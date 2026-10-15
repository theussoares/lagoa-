import type { Post } from '~/types/content'

export function buildHomeSchema(siteUrl: string, name: string, description: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', name: 'Lagoa+', url: siteUrl || undefined, areaServed: 'Três Lagoas, MS' },
      { '@type': 'WebSite', name, url: siteUrl || undefined, inLanguage: 'pt-BR', description },
      {
        '@type': 'Product',
        name: 'Lagoa+ Fundador',
        description,
        offers: { '@type': 'Offer', price: '79.90', priceCurrency: 'BRL' },
      },
    ],
  }
}

export function buildArticleSchema(post: Post, url: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    inLanguage: 'pt-BR',
    author: { '@type': 'Organization', name: 'Equipe Lagoa+' },
    publisher: { '@type': 'Organization', name: 'Lagoa+' },
    mainEntityOfPage: url || undefined,
  }
}
