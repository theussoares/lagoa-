import { POSTS } from '../../../site/app/content/posts'
import type { LinkItem, LinkSection } from '../types/link'

const LATEST_POSTS = 3

interface LinksScreen {
  readonly sections: ComputedRef<LinkSection[]>
  readonly merchantSignIn: ComputedRef<{ href: string; label: string }>
}

export function useLinksScreen(): LinksScreen {
  const { t } = useI18n()
  const { siteUrl, customerUrl, merchantUrl, whatsappNumber } = useRuntimeConfig().public

  const partner = computed<LinkItem>(() => ({
    id: 'partner',
    href: withBioUtm(siteUrl, 'partner'),
    label: t('links.partner.label'),
    hint: t('links.partner.hint'),
    icon: 'i-ph-storefront-bold',
    tone: 'primary',
    newTab: false,
  }))

  const wallet = computed<LinkItem>(() => ({
    id: 'wallet',
    href: withBioUtm(customerUrl, 'wallet'),
    label: t('links.wallet.label'),
    hint: t('links.wallet.hint'),
    icon: 'i-ph-wallet-bold',
    tone: 'default',
    newTab: false,
  }))

  const whatsapp = computed<LinkItem>(() => ({
    id: 'whatsapp',
    href: `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(t('links.whatsapp.message'))}`,
    label: t('links.whatsapp.label'),
    hint: t('links.whatsapp.hint'),
    icon: 'i-ph-whatsapp-logo-bold',
    tone: 'default',
    newTab: true,
  }))

  const guide = computed<LinkItem>(() => ({
    id: 'guide',
    href: withBioUtm(`${siteUrl}/guia`, 'guide'),
    label: t('links.guide.label'),
    hint: t('links.guide.hint'),
    icon: 'i-ph-book-open-bold',
    tone: 'default',
    newTab: false,
  }))

  const posts = computed<LinkItem[]>(() =>
    [...POSTS]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, LATEST_POSTS)
      .map((post) => ({
        id: `post-${post.slug}`,
        href: withBioUtm(`${siteUrl}/blog/${post.slug}`, 'blog'),
        label: post.title,
        hint: t('links.post.reading', { minutes: post.readingMinutes }),
        icon: 'i-ph-newspaper-bold',
        tone: 'default',
        newTab: false,
      })),
  )

  const sections = computed<LinkSection[]>(() => [
    { id: 'main', title: null, items: [partner.value, wallet.value, whatsapp.value] },
    { id: 'learn', title: t('links.sections.learn'), items: [guide.value, ...posts.value] },
  ])

  const merchantSignIn = computed(() => ({ href: withBioUtm(`${merchantUrl}/balcao/entrar`, 'merchant'), label: t('links.merchantSignIn') }))

  return { sections, merchantSignIn }
}
