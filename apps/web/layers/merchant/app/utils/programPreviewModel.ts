import { STAMPS_TARGET_MAX } from '#shared/constants/domain'
import { welcomeUnits } from '#shared/domain/bonusRules'
import { earnRateOf, unitOf } from '#shared/domain/programStrategies'
import type { ProgramDraft } from '#shared/schemas/program'
import type { Translate } from '#layers/core/app/types/i18n'
import type { StampCardBody, StampCardModel } from '#layers/ui/app/types/wallet'
import { stampTilt } from '#layers/ui/app/utils/stampTilt'

const PREVIEW_CARD_ID = 'program-preview'
const PREVIEW_ICON = 'i-ph-storefront'

export interface ProgramPreview {
  readonly card: StampCardModel
  /** "1 carimbo por visita", "1 ponto por real gasto". */
  readonly earnLine: string
}

function pad(value: number, width: number): string {
  return String(value).padStart(width, '0')
}

function previewBody(draft: ProgramDraft, balance: number, t: Translate): StampCardBody {
  const { target } = draft.rules
  const unit = unitOf(draft.rules)
  if (unit === 'stamp' && target <= STAMPS_TARGET_MAX) {
    return {
      kind: 'slots',
      slots: Array.from({ length: target }, (_, index) => {
        const number = index + 1
        return {
          number,
          stamped: number <= balance,
          isRewardSlot: number === target,
          tilt: stampTilt(PREVIEW_CARD_ID, number),
          fresh: false,
          delayMs: 0,
        }
      }),
    }
  }
  return {
    kind: 'ruler',
    balance,
    target,
    label: t('wallet.card.rulerLabel', { balance, target, unit: t(`units.${unit}Noun`, {}, target) }),
  }
}

/**
 * O cartão novo de um cliente com as regras do rascunho: começa com as
 * boas-vindas, então ligar o bônus aparece na hora na prévia.
 */
export function toProgramPreview(draft: ProgramDraft, shopName: string, t: Translate): ProgramPreview {
  const { target } = draft.rules
  const unit = unitOf(draft.rules)
  const balance = Math.min(welcomeUnits(draft.bonusRules), Math.max(0, target - 1))
  const remaining = target - balance
  const units = t(`units.${unit}`, {}, remaining)
  const reward = draft.reward.title.trim() === '' ? t('program.preview.rewardPlaceholder') : draft.reward.title.trim()
  const width = String(target).length
  const rate = earnRateOf(draft.rules)

  return {
    card: {
      id: PREVIEW_CARD_ID,
      shopName,
      shopDetail: t('program.preview.newCard'),
      icon: PREVIEW_ICON,
      progress: `${pad(balance, width)}/${pad(target, width)}`,
      body: previewBody(draft, balance, t),
      status: { kind: 'remaining', count: String(remaining), unitLine: t(`wallet.card.unitsFor.${unit}`, {}, remaining), reward },
      peek: t('wallet.card.peekRemaining', { units }, remaining),
      summary: t('wallet.card.summary', { shop: shopName, balance, target, units, reward }, remaining),
      rewardReady: false,
    },
    earnLine: t(`program.preview.earn.${rate.per}`, { units: t(`units.${unit}`, {}, rate.units) }),
  }
}
