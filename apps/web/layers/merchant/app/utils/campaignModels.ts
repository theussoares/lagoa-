import { LAPSED_AFTER_DAYS } from '#shared/constants/domain'
import type { Campaign, ReminderDraft, ReminderReach } from '#shared/schemas/campaign'
import type { ProgramUnit } from '#shared/schemas/program'
import { formatShortDateTime } from '#shared/utils/dateFormat'
import type { Translate } from '#layers/core/app/types/i18n'
import { unitsText } from '#layers/core/app/utils/units'
import type { ReachLine, ReachModel, ReminderPreviewModel, CampaignHistoryRow } from '../types/campaign'

export function toReachModel(reach: ReminderReach, t: Translate): ReachModel {
  const lines: ReachLine[] = [
    { key: 'lapsed', icon: 'i-ph-user-minus', text: t('campaigns.reach.lapsed', { count: reach.lapsed, days: LAPSED_AFTER_DAYS }, reach.lapsed) },
  ]
  if (reach.withoutConsent > 0) {
    lines.push({
      key: 'withoutConsent',
      icon: 'i-ph-bell-slash',
      text: t('campaigns.reach.withoutConsent', { count: reach.withoutConsent }, reach.withoutConsent),
    })
  }
  if (reach.expired > 0) {
    lines.push({ key: 'expired', icon: 'i-ph-hourglass-simple-low', text: t('campaigns.reach.expired', { count: reach.expired }, reach.expired) })
  }
  if (reach.alreadyReminded > 0) {
    lines.push({
      key: 'alreadyReminded',
      icon: 'i-ph-clock-counter-clockwise',
      text: t('campaigns.reach.alreadyReminded', { count: reach.alreadyReminded }, reach.alreadyReminded),
    })
  }
  return {
    reachable: reach.reachable,
    headline: t('campaigns.reach.reachable', { count: reach.reachable }, reach.reachable),
    lines,
    emptyHint: reach.reachable > 0 ? null : t('campaigns.reach.emptyHint', { days: LAPSED_AFTER_DAYS }),
  }
}

export function toReminderPreview(draft: ReminderDraft, shopName: string, unit: ProgramUnit, t: Translate): ReminderPreviewModel {
  return {
    shopName,
    message: draft.message.trim(),
    bonus: draft.bonusUnits > 0 ? t('campaigns.preview.bonus', { units: unitsText(t, unit, draft.bonusUnits) }) : null,
  }
}

export function toCampaignHistoryRow(campaign: Campaign, t: Translate): CampaignHistoryRow {
  return {
    id: campaign.id,
    sentAt: formatShortDateTime(campaign.sentAt),
    recipients: t('campaigns.history.recipients', { count: campaign.recipientsCount }, campaign.recipientsCount),
    bonus:
      campaign.bonusUnits > 0
        ? t('campaigns.history.bonus', { units: unitsText(t, campaign.unit, campaign.bonusUnits) })
        : t('campaigns.history.noBonus'),
    message: campaign.message,
  }
}
