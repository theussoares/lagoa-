import type { ShopPoster } from '#shared/schemas/shop'
import { checkInLink } from '#shared/utils/checkInCode'
import type { Translate } from '#layers/core/app/types/i18n'
import type { CheckInPosterModel } from '../types/poster'
import { qrPath } from '#layers/ui/app/utils/qrPath'
import { unitsText } from '#layers/core/app/utils/units'

/** O QR leva ao check-in neste mesmo endereço do app; o código embaixo serve para quem prefere digitar. */
export function toCheckInPosterModel(poster: ShopPoster, origin: string, t: Translate): CheckInPosterModel {
  return {
    brand: t('app.name'),
    shopName: poster.shopName,
    headline: t('poster.headline', { units: unitsText(t, poster.unit, poster.target), reward: poster.rewardTitle }),
    instruction: t('poster.instruction'),
    codeLabel: t('poster.codeLabel'),
    code: poster.checkInCode,
    qr: qrPath(checkInLink(origin, poster.checkInCode)),
    qrLabel: t('poster.qrLabel', { shop: poster.shopName }),
  }
}
