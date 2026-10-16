import { POSTS } from '~/content/posts'
import type { BioLinkItem, BioLinkSection } from '../types/bioLink'

const LATEST_POSTS = 2

interface BioLinks {
  readonly sections: ComputedRef<BioLinkSection[]>
  readonly merchantSignIn: ComputedRef<{ href: string; label: string }>
}

export function useBioLinks(): BioLinks {
  const { t } = useI18n()
  const { appUrl, customerUrl } = useRuntimeConfig().public
  const { href: whatsappHref } = useWhatsAppLink('whatsappMessageInstagram')

  const partner = computed<BioLinkItem>(() => ({
    id: 'partner',
    href: withBioUtm('/', 'partner'),
    label: t('bio.partner.label'),
    hint: t('bio.partner.hint'),
    icon: 'i-ph-storefront-bold',
    tone: 'primary',
    cta: t('bio.partner.cta'),
    newTab: false,
  }))

  // Direto na carteira: quem ainda não entrou cai no login e volta para ela (middleware customer-auth).
  const wallet = computed<BioLinkItem>(() => ({
    id: 'wallet',
    href: withBioUtm(`${customerUrl}/carteira`, 'wallet'),
    label: t('bio.wallet.label'),
    hint: t('bio.wallet.hint'),
    icon: 'i-ph-wallet-bold',
    tone: 'secondary',
    cta: t('bio.wallet.cta'),
    newTab: false,
  }))

  const whatsapp = computed<BioLinkItem>(() => ({
    id: 'whatsapp',
    href: whatsappHref.value,
    label: t('bio.whatsapp.label'),
    hint: t('bio.whatsapp.hint'),
    icon: 'i-ph-whatsapp-logo-bold',
    tone: 'default',
    cta: null,
    newTab: true,
  }))

  const guide = computed<BioLinkItem>(() => ({
    id: 'guide',
    href: withBioUtm('/guia', 'guide'),
    label: t('bio.guide.label'),
    hint: t('bio.guide.hint'),
    icon: 'i-ph-book-open-bold',
    tone: 'default',
    cta: null,
    newTab: false,
  }))

  const posts = computed<BioLinkItem[]>(() =>
    [...POSTS]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, LATEST_POSTS)
      .map((post) => ({
        id: `post-${post.slug}`,
        href: withBioUtm(`/blog/${post.slug}`, 'blog'),
        label: post.title,
        hint: t('bio.post.reading', { minutes: post.readingMinutes }),
        icon: 'i-ph-newspaper-bold',
        tone: 'default',
        cta: null,
        newTab: false,
      })),
  )

  const sections = computed<BioLinkSection[]>(() => [
    { id: 'main', title: null, items: [partner.value, wallet.value] },
    { id: 'contact', title: null, items: [whatsapp.value] },
    { id: 'learn', title: t('bio.sections.learn'), items: [guide.value, ...posts.value] },
  ])

  const merchantSignIn = computed(() => ({ href: withBioUtm(`${appUrl}/balcao/entrar`, 'merchant'), label: t('bio.merchantSignIn') }))

  return { sections, merchantSignIn }
}
