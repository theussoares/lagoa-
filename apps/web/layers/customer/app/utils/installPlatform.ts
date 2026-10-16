import type { InstallPlatform } from '../types/installInvite'

const IN_APP_BROWSER = /FBAN|FBAV|Instagram|WhatsApp|Line\/|; wv\)/i

/** iPhone/iPad só instalam pelo Safari (o iPad novo se apresenta como Mac com toque). */
export function detectInstallPlatform(userAgent: string, maxTouchPoints: number): InstallPlatform | null {
  if (IN_APP_BROWSER.test(userAgent)) return null
  const isIos = /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1)
  if (isIos) return /CriOS|FxiOS|EdgiOS|OPiOS/.test(userAgent) ? null : 'ios'
  return /Android/.test(userAgent) ? 'android' : null
}
