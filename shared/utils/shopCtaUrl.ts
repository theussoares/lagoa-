import { SHOP_CTA_URL_MAX_LENGTH } from '../constants/domain'

const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i

/** O que o lojista digita sem esquema (`www.loja.com`) ganha `https://`; o resto só perde os espaços das pontas. */
export function normalizeShopCtaUrl(input: string): string {
  const trimmed = input.trim()
  if (trimmed === '' || HAS_SCHEME.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

/** Só `https://` para um site público: sem usuário/senha, `localhost`, host sem ponto nem IP literal. */
export function isPublicHttpsUrl(input: string): boolean {
  if (input.length === 0 || input.length > SHOP_CTA_URL_MAX_LENGTH || /\s/.test(input)) return false
  let url: URL
  try {
    url = new URL(input)
  } catch {
    return false
  }
  if (url.protocol !== 'https:' || url.username !== '' || url.password !== '') return false
  const host = url.hostname
  if (host.startsWith('[') || !host.includes('.')) return false
  if (host === 'localhost' || host.endsWith('.localhost')) return false
  const lastLabel = host.split('.').pop() ?? ''
  return !/^\d+$/.test(lastLabel)
}
